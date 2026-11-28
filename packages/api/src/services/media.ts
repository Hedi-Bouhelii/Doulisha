import { randomUUID } from 'node:crypto';

import { schema, type Executor } from '@doulisha/db';
import {
  allowedFormats,
  checkMediaUpload,
  MEDIA_MAX_BYTES,
  mediaPublicId,
  mediaPublicIdBelongsTo,
  mediaUploadPolicies,
  type MediaUploadAnswer,
  type MediaUploadKind,
} from '@doulisha/storage';
import { and, eq } from 'drizzle-orm';

import type { ServiceDeps } from '../deps';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { loadManagedEvent } from './event-editor';
import { loadOwnProfile } from './organizers';
import { loadOwnMedia, toMediaRef, type MediaRow } from './media-refs';
import { getOwnOrder } from './payments';

export { loadOwnMedia, toMediaRef, type MediaRow } from './media-refs';

type MediaDeps = Pick<ServiceDeps, 'media'>;

/** Where an upload will be attached; checked before anything is signed. */
export interface MediaTarget {
  eventId?: string | undefined;
  organizerProfileId?: string | undefined;
  /** Booking reference, for payment proofs. */
  reference?: string | undefined;
}

export function requireUploader(actor: Actor | null, kind: MediaUploadKind): Actor {
  if (!actor) throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
  // Guests who booked without an account may send a payment proof, nothing else.
  if (actor.isAnonymous && kind !== 'payment-proof') {
    throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
  }
  return actor;
}

/** Spec 2.3 step 1: the member may edit what the file will be attached to. */
async function assertMayUploadFor(
  db: Executor,
  actor: Actor,
  kind: MediaUploadKind,
  target: MediaTarget,
) {
  if (kind === 'payment-proof') {
    if (!target.reference) throw new AppError('BAD_REQUEST', 'errors.generic');
    await getOwnOrder(db, actor, target.reference);
    return;
  }
  // A cover or logo may be uploaded before its event or profile exists (quick
  // invitation, organizer sign-up); it is checked again when attached.
  if (target.eventId) await loadManagedEvent(db, actor, target.eventId);
  if (target.organizerProfileId) await loadOwnProfile(db, actor, target.organizerProfileId);
}

/**
 * Spec 2.3 step 1 (`media.sign`): signed parameters to send the original file
 * straight to storage. No transformation is ever signed (spec 2.2).
 */
export async function signMediaUpload(
  db: Executor,
  deps: MediaDeps,
  actor: Actor | null,
  input: MediaTarget & { kind: MediaUploadKind; contentType: string; size: number },
  now = new Date(),
) {
  const uploader = requireUploader(actor, input.kind);
  const check = checkMediaUpload(input.kind, input.contentType, input.size);
  if (!check.ok) {
    throw new AppError(
      'BAD_REQUEST',
      check.reason === 'type' ? 'errors.fileType' : 'errors.fileTooLarge',
    );
  }
  await assertMayUploadFor(db, uploader, input.kind, input);
  return deps.media.signUpload({
    publicId: mediaPublicId(deps.media.folder, input.kind, uploader.userId, randomUUID()),
    private: check.private,
    allowedFormats: allowedFormats(input.kind),
    contentType: input.contentType,
    maxBytes: MEDIA_MAX_BYTES,
    now,
  });
}

/**
 * Throws unless the storage's answer is genuine (signed), for a public id
 * signed for this member and kind, in an accepted format, and the stored file
 * has exactly the size of the uploaded one (Q1: the original is untouched).
 */
export function assertValidAnswer(
  deps: MediaDeps,
  uploader: Actor,
  kind: MediaUploadKind,
  answer: MediaUploadAnswer,
  size: number,
) {
  if (!deps.media.verifyAnswer(answer)) throw new AppError('BAD_REQUEST', 'errors.generic');
  if (!mediaPublicIdBelongsTo(answer.public_id, deps.media.folder, kind, uploader.userId)) {
    throw new AppError('FORBIDDEN', 'errors.forbidden');
  }
  if (!allowedFormats(kind).includes(answer.format)) {
    throw new AppError('BAD_REQUEST', 'errors.fileType');
  }
  if (answer.bytes !== size) throw new AppError('BAD_REQUEST', 'errors.generic');
}

/** Spec 2.3 step 3 (`media.confirm`): records a checked upload (see `assertValidAnswer`). */
export async function confirmMediaUpload(
  db: Executor,
  deps: MediaDeps,
  actor: Actor | null,
  input: {
    kind: MediaUploadKind;
    answer: MediaUploadAnswer;
    size: number;
    checksumSha256: string;
    eventId?: string | undefined;
  },
) {
  const uploader = requireUploader(actor, input.kind);
  const { answer } = input;
  assertValidAnswer(deps, uploader, input.kind, answer, input.size);
  if (input.eventId) await loadManagedEvent(db, uploader, input.eventId);

  const [existing] = await db
    .select()
    .from(schema.media)
    .where(and(eq(schema.media.key, answer.public_id), eq(schema.media.ownerId, uploader.userId)));
  if (existing) return { id: existing.id, media: toMediaRef(existing) };

  const policy = mediaUploadPolicies[input.kind];
  const [row] = await db
    .insert(schema.media)
    .values({
      ownerId: uploader.userId,
      kind: answer.format === 'pdf' ? 'document' : 'image',
      bucket: policy.private ? 'private' : 'public',
      provider: deps.media.provider,
      key: answer.public_id,
      purpose: policy.purpose,
      version: answer.version,
      format: answer.format,
      bytes: answer.bytes,
      checksumSha256: input.checksumSha256,
      width: answer.width ?? null,
      height: answer.height ?? null,
      eventId: input.eventId ?? null,
    })
    .returning();
  return { id: row!.id, media: toMediaRef(row!) };
}

/**
 * For optional image fields: undefined keeps the image, null removes it, and
 * an id must be the member's own upload for `purpose`. Returns the id to store.
 */
export async function attachableMedia(
  db: Executor,
  actor: Actor,
  mediaId: string | null | undefined,
  purpose: NonNullable<MediaRow['purpose']>,
): Promise<string | null | undefined> {
  if (mediaId === undefined || mediaId === null) return mediaId;
  return (await loadOwnMedia(db, actor, mediaId, [purpose])).id;
}
