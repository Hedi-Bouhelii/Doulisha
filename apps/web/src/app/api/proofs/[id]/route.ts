import { readFile } from 'node:fs/promises';

import { AppError, getProofForViewer, loadManagedEvent } from '@doulisha/api';
import { getUserRoles } from '@doulisha/auth';
import { headers } from 'next/headers';

import { getAuth } from '@/server/auth';
import { getDb } from '@/server/db';
import { localPath } from '@/server/local-files';

const types: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

/**
 * Serves a payment proof from private storage (PRT-03) to its buyer or to
 * whoever manages the event. Nobody else, and never cached.
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
    const file = await readFile(localPath('private', row.proof.fileKey));
    const extension = row.proof.fileKey.split('.').pop() ?? '';
    return new Response(file, {
      headers: {
        'content-type': types[extension] ?? 'application/octet-stream',
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof AppError) return new Response('Not found', { status: 404 });
    throw error;
  }
}
