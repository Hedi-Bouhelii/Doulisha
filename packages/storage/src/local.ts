import { createHmac, timingSafeEqual } from 'node:crypto';

import type { StorageProvider, UploadTicket } from './types';

/** Signed, expiring upload token: base64url(JSON) + "." + HMAC. */
export interface LocalUploadClaims {
  key: string;
  bucket: 'public' | 'private';
  contentType: string;
  maxBytes: number;
  exp: number;
}

function hmac(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function signUploadToken(claims: LocalUploadClaims, secret: string): string {
  const data = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${data}.${hmac(data, secret)}`;
}

export function verifyUploadToken(
  token: string,
  secret: string,
  now = Date.now(),
): LocalUploadClaims | null {
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;
  const expected = Buffer.from(hmac(data, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  const claims = JSON.parse(Buffer.from(data, 'base64url').toString()) as LocalUploadClaims;
  return claims.exp > now ? claims : null;
}

/**
 * Development storage: the web app's /api/uploads route writes the files
 * (public files under public/uploads, private files outside public/).
 * Replaced by Cloudflare R2 presigned uploads in Phase 6.
 */
export function createLocalProvider({ secret }: { secret: string }): StorageProvider {
  return {
    id: 'local',
    createUpload({ key, bucket, contentType, maxBytes }): Promise<UploadTicket> {
      const token = signUploadToken(
        { key, bucket, contentType, maxBytes, exp: Date.now() + 10 * 60_000 },
        secret,
      );
      return Promise.resolve({
        method: 'PUT',
        url: `/api/uploads/${token}`,
        headers: { 'content-type': contentType },
        key,
      });
    },
    publicUrl(key) {
      return `/uploads/${key}`;
    },
  };
}
