import { readFile } from 'node:fs/promises';

import { AppError, getProofForViewer, loadManagedEvent, loadProofMedia } from '@doulisha/api';
import { getUserRoles } from '@doulisha/auth';
import { headers } from 'next/headers';

import { getAuth } from '@/server/auth';
import { getDb } from '@/server/db';
import { getServiceDeps } from '@/server/deps';
import { localPath } from '@/server/local-files';

const types: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

const privateHeaders = {
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

/** Browsers cannot show HEIC: Cloudinary converts iPhone receipts to JPEG on download. */
function viewableFormat(format: string) {
  return format === 'heic' || format === 'heif' ? 'jpg' : format;
}

/**
 * Serves a payment proof from private storage (PRT-03, MED-05) to its buyer or
 * to whoever manages the event. Nobody else, and never cached. Cloudinary
 * proofs redirect to a signed link that expires after 60 seconds; local files
 * (development, older proofs) are read from disk.
 */
export async function GET(_request: Request, { params }: RouteContext<'/api/proofs/[id]'>) {
  const { id } = await params;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });
  const db = getDb();
  const actor = {
    userId: session.user.id,
    roles: await getUserRoles(db, session.user.id),
    isAnonymous: session.user.isAnonymous === true,
  };
  try {
    const row = await getProofForViewer(db, actor, id);
    if (row.buyerId !== actor.userId) await loadManagedEvent(db, actor, row.eventId!);

    const media = row.proof.mediaId ? await loadProofMedia(db, row.proof.mediaId) : null;
    if (media?.provider === 'cloudinary') {
      const url = getServiceDeps().media.originalUrl({
        publicId: media.key,
        format: viewableFormat(media.format ?? 'jpg'),
        private: media.bucket === 'private',
      });
      if (!url) return new Response('Not found', { status: 404 });
      return new Response(null, { status: 302, headers: { ...privateHeaders, location: url } });
    }

    const file = await readFile(localPath('private', row.proof.fileKey));
    const extension = row.proof.fileKey.split('.').pop() ?? '';
    return new Response(file, {
      headers: {
        ...privateHeaders,
        'content-type': types[extension] ?? 'application/octet-stream',
      },
    });
  } catch (error) {
    if (error instanceof AppError) return new Response('Not found', { status: 404 });
    // A proof whose file is gone (demo data, a lost local file) is missing, not a server error.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Response('Not found', { status: 404 });
    }
    throw error;
  }
}
