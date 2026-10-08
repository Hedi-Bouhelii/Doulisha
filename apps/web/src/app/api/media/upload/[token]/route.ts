import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { formatOf, signLocalAnswer, verifyUploadToken } from '@doulisha/storage';
import sharp from 'sharp';

import { derivedSecret } from '@/server/deps';
import { fileMatchesType } from '@/server/file-signature';
import { localPath } from '@/server/local-files';

/** Width and height as displayed (EXIF orientations 5 to 8 swap them). */
async function displaySize(bytes: Uint8Array) {
  try {
    const meta = await sharp(bytes).metadata();
    if (!meta.width || !meta.height) return {};
    const swap = (meta.orientation ?? 1) >= 5;
    return swap
      ? { width: meta.height, height: meta.width }
      : { width: meta.width, height: meta.height };
  } catch {
    // HEIC and PDF files are stored without a size; local files are served as they are.
    return {};
  }
}

/**
 * Module MED upload on local disk, for runs without Cloudinary keys (ADR 0026).
 * Accepts one PUT per signed token, checks type, size and file signature,
 * stores the original byte for byte and answers like Cloudinary, signed, so
 * `media.confirm` checks both providers the same way.
 */
export async function PUT(request: Request, { params }: RouteContext<'/api/media/upload/[token]'>) {
  const { token } = await params;
  const secret = derivedSecret('media');
  const claims = verifyUploadToken(token, secret);
  if (!claims) return new Response('Invalid or expired upload link', { status: 403 });
  const contentType = request.headers.get('content-type') ?? '';
  const format = formatOf(contentType);
  if (contentType !== claims.contentType || !format) {
    return new Response('Unexpected content type', { status: 415 });
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > claims.maxBytes) return new Response('File too large', { status: 413 });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > claims.maxBytes) {
    return new Response('File too large', { status: 413 });
  }
  if (!fileMatchesType(contentType, bytes)) {
    return new Response('File content does not match its type', { status: 415 });
  }
  const path = localPath(claims.bucket, `${claims.key}.${format}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
  });
  const version = Math.floor(Date.now() / 1000);
  return Response.json({
    public_id: claims.key,
    version,
    ...(await displaySize(bytes)),
    format,
    bytes: bytes.byteLength,
    signature: signLocalAnswer({ public_id: claims.key, version }, secret),
  });
}
