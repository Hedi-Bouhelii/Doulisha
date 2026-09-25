import { describe, expect, it } from 'vitest';

import { signUploadToken, verifyUploadToken } from './local';
import { buildKey, checkUpload, keyBelongsTo } from './policy';

describe('upload policy', () => {
  it('accepts allowed types and sizes', () => {
    expect(checkUpload('event-cover', 'image/webp', 1000)).toMatchObject({
      ok: true,
      bucket: 'public',
      extension: 'webp',
    });
    expect(checkUpload('payment-proof', 'application/pdf', 1000)).toMatchObject({
      ok: true,
      bucket: 'private',
    });
  });

  it('rejects other types and oversized or empty files', () => {
    expect(checkUpload('event-cover', 'application/pdf', 1000)).toEqual({
      ok: false,
      reason: 'type',
    });
    expect(checkUpload('event-cover', 'image/png', 6 * 1024 * 1024)).toEqual({
      ok: false,
      reason: 'size',
    });
    expect(checkUpload('event-cover', 'image/png', 0)).toEqual({ ok: false, reason: 'size' });
  });

  it('ties keys to their owner', () => {
    const key = buildKey('payment-proof', 'user-1', 'abc', 'jpg');
    expect(keyBelongsTo(key, 'payment-proof', 'user-1')).toBe(true);
    expect(keyBelongsTo(key, 'payment-proof', 'user-2')).toBe(false);
    expect(keyBelongsTo('payment-proof/user-1/../user-2/x.jpg', 'payment-proof', 'user-1')).toBe(
      false,
    );
  });
});

describe('local upload tokens', () => {
  const claims = {
    key: 'event-cover/u/1.webp',
    bucket: 'public' as const,
    contentType: 'image/webp',
    maxBytes: 100,
    exp: 2_000,
  };

  it('verifies its own tokens until they expire', () => {
    const token = signUploadToken(claims, 's');
    expect(verifyUploadToken(token, 's', 1_000)).toEqual(claims);
    expect(verifyUploadToken(token, 's', 3_000)).toBeNull();
    expect(verifyUploadToken(token, 'other', 1_000)).toBeNull();
    expect(verifyUploadToken(`${token}x`, 's', 1_000)).toBeNull();
  });
});
