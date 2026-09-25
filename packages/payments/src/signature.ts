import { createHmac, timingSafeEqual } from 'node:crypto';

/** HMAC-SHA256 of the raw body, hex encoded. */
export function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/** Constant-time comparison of a received signature with the expected one. */
export function verify(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(sign(body, secret), 'hex');
  const received = Buffer.from(signature, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
