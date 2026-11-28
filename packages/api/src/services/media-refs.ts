import { schema, type Executor } from '@doulisha/db';
import type { MediaRef } from '@doulisha/storage';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { AppError } from '../errors';
import type { Actor } from '../permissions';

export type MediaRow = typeof schema.media.$inferSelect;

/** What delivery needs from a media row (never a URL, spec 2.3 step 4). */
export function toMediaRef(row: MediaRow): MediaRef {
  return {
    provider: row.provider,
    key: row.key,
    version: row.version,
    format: row.format ?? 'jpg',
    width: row.width ?? 0,
    height: row.height ?? 0,
    crop: row.crop ?? null,
  };
}

/**
 * Public media by id, for pages that show covers, logos and photos: one query
 * for a whole list. Private files (payment proofs) are never returned.
 */
export async function loadMediaRefs(
  db: Executor,
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, MediaRef>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map();
  const rows = await db
    .select()
    .from(schema.media)
    .where(
      and(
        inArray(schema.media.id, wanted),
        eq(schema.media.bucket, 'public'),
        isNull(schema.media.deletedAt),
      ),
    );
  return new Map(rows.map((row) => [row.id, toMediaRef(row)]));
}

export function pickMedia(refs: Map<string, MediaRef>, id: string | null | undefined) {
  return id ? (refs.get(id) ?? null) : null;
}

/**
 * A media row the member uploaded for one of `purposes`, before attaching it
 * to an event, a profile or a payment. Nobody can attach someone else's file.
 * Here rather than in media.ts so payments.ts can use it without an import cycle.
 */
export async function loadOwnMedia(
  db: Executor,
  actor: Actor,
  mediaId: string,
  purposes: readonly NonNullable<MediaRow['purpose']>[],
) {
  const [row] = await db
    .select()
    .from(schema.media)
    .where(and(eq(schema.media.id, mediaId), isNull(schema.media.deletedAt)));
  if (!row || row.ownerId !== actor.userId || !row.purpose || !purposes.includes(row.purpose)) {
    throw new AppError('FORBIDDEN', 'errors.forbidden');
  }
  return row;
}

/** The media row of a payment proof, private ones included; for permission-checked viewers. */
export async function loadProofMedia(db: Executor, mediaId: string) {
  const [row] = await db
    .select()
    .from(schema.media)
    .where(and(eq(schema.media.id, mediaId), isNull(schema.media.deletedAt)));
  return row ?? null;
}
