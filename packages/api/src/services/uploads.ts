import { randomUUID } from 'node:crypto';

import { buildKey, checkUpload, type UploadPurpose } from '@doulisha/storage';

import type { ServiceDeps } from '../deps';
import { AppError } from '../errors';
import type { Actor } from '../permissions';

/**
 * Presigned upload (BUILD_PROMPT section 7): the type and size are checked
 * before any byte is sent, and the key is tied to the uploader so it can only
 * be attached to their own records.
 */
export async function createUpload(
  deps: ServiceDeps,
  actor: Actor | null,
  input: { purpose: UploadPurpose; contentType: string; size: number },
) {
  if (!actor) throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
  const check = checkUpload(input.purpose, input.contentType, input.size);
  if (!check.ok) {
    throw new AppError(
      'BAD_REQUEST',
      check.reason === 'type' ? 'errors.fileType' : 'errors.fileSize',
    );
  }
  const key = buildKey(input.purpose, actor.userId, randomUUID(), check.extension);
  const ticket = await deps.storage.createUpload({
    key,
    bucket: check.bucket,
    contentType: input.contentType,
    maxBytes: check.maxBytes,
  });
  return {
    ...ticket,
    publicUrl: check.bucket === 'public' ? deps.storage.publicUrl(key) : null,
  };
}
