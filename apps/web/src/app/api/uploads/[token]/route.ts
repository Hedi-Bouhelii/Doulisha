import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { verifyUploadToken } from '@doulisha/storage';

import { derivedSecret } from '@/server/deps';
import { fileMatchesType } from '@/server/file-signature';
import { localPath } from '@/server/local-files';

/**
 * Development upload endpoint behind the local storage provider. Accepts one
 * PUT per signed token, checks type, size and file signature, then writes the
 * file. Cloudflare R2 presigned URLs replace it in Phase 6.
 */
export async function PUT(request: Request, { params }: RouteContext<'/api/uploads/[token]'>) {
  const { token } = await params;
  const claims = verifyUploadToken(token, derivedSecret('uploads'));
  if (!claims) return new Response('Invalid or expired upload link', { status: 403 });
  if (request.headers.get('content-type') !== claims.contentType) {
    return new Response('Unexpected content type', { status: 415 });
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > claims.maxBytes) return new Response('File too large', { status: 413 });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > claims.maxBytes) {
    return new Response('File too large', { status: 413 });
  }
  if (!fileMatchesType(claims.contentType, bytes)) {
    return new Response('File content does not match its type', { status: 415 });
  }
  const path = localPath(claims.bucket, claims.key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
  });
  return new Response(null, { status: 204 });
}
