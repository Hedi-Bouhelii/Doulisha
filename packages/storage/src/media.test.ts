import { describe, expect, it } from 'vitest';

import { verifyUploadToken } from './local';
import {
  allowedFormats,
  checkMediaUpload,
  contentTypeOf,
  MEDIA_MAX_BYTES,
  mediaPublicId,
  mediaPublicIdBelongsTo,
} from './media-policy';
import { createCloudinaryStorage, createLocalMediaStorage, signLocalAnswer } from './media-storage';

describe('media upload policy (Q8)', () => {
  it('accepts JPEG, PNG, WebP and HEIC up to 10 MB', () => {
    expect(checkMediaUpload('event-cover', 'image/heic', 9_000_000)).toEqual({
      ok: true,
      format: 'heic',
      private: false,
      purpose: 'cover',
    });
    expect(checkMediaUpload('event-cover', 'image/png', MEDIA_MAX_BYTES + 1)).toEqual({
      ok: false,
      reason: 'size',
    });
    expect(checkMediaUpload('event-cover', 'application/pdf', 1000)).toEqual({
      ok: false,
      reason: 'type',
    });
  });

  it('keeps payment proofs private and accepts PDF receipts', () => {
    expect(checkMediaUpload('payment-proof', 'application/pdf', 1000)).toMatchObject({
      ok: true,
      private: true,
      purpose: 'proof',
    });
    expect(allowedFormats('payment-proof')).toContain('pdf');
    expect(allowedFormats('organizer-logo')).not.toContain('pdf');
  });

  it('recognises HEIC files that the browser left without a type', () => {
    expect(contentTypeOf({ type: '', name: 'IMG_0042.HEIC' }, 'event-cover')).toBe('image/heic');
    expect(contentTypeOf({ type: 'image/jpeg', name: 'x' }, 'event-cover')).toBe('image/jpeg');
    expect(contentTypeOf({ type: '', name: 'notes.pdf' }, 'event-cover')).toBe('');
    expect(contentTypeOf({ type: '', name: 'receipt.pdf' }, 'payment-proof')).toBe(
      'application/pdf',
    );
  });

  it('ties public ids to their folder, kind and uploader', () => {
    const id = mediaPublicId('doulisha/dev', 'event-cover', 'user-1', 'abc');
    expect(id).toBe('doulisha/dev/event-cover/user-1/abc');
    expect(mediaPublicIdBelongsTo(id, 'doulisha/dev', 'event-cover', 'user-1')).toBe(true);
    expect(mediaPublicIdBelongsTo(id, 'doulisha/dev', 'event-cover', 'user-2')).toBe(false);
    expect(mediaPublicIdBelongsTo(id, 'doulisha/prod', 'event-cover', 'user-1')).toBe(false);
    expect(mediaPublicIdBelongsTo(id, 'doulisha/dev', 'organizer-logo', 'user-1')).toBe(false);
    expect(
      mediaPublicIdBelongsTo(
        'doulisha/dev/event-cover/user-1/../x',
        'doulisha/dev',
        'event-cover',
        'user-1',
      ),
    ).toBe(false);
  });
});

describe('Cloudinary storage', () => {
  const storage = createCloudinaryStorage({
    cloudName: 'demo',
    apiKey: 'key',
    apiSecret: 'secret',
    folder: 'doulisha/dev',
  });

  it('signs a direct upload of the original, authenticated for proofs', () => {
    const form = storage.signUpload({
      publicId: 'doulisha/dev/payment-proof/u/1',
      private: true,
      allowedFormats: ['jpg', 'pdf'],
      contentType: 'image/jpeg',
      maxBytes: 10,
      now: new Date(1_700_000_000_000),
    });
    expect(form).toMatchObject({
      provider: 'cloudinary',
      method: 'POST',
      url: 'https://api.cloudinary.com/v1_1/demo/image/upload',
      fields: { type: 'authenticated', timestamp: '1700000000', api_key: 'key' },
    });
  });

  it('gives a signed link to the original that expires after 60 seconds', () => {
    const link = new URL(
      storage.originalUrl({
        publicId: 'doulisha/dev/payment-proof/u/1',
        format: 'jpg',
        private: true,
        now: new Date(1_700_000_000_000),
      })!,
    );
    expect(link.searchParams.get('expires_at')).toBe('1700000060');
    expect(link.searchParams.get('type')).toBe('authenticated');
  });
});

describe('local storage', () => {
  const storage = createLocalMediaStorage({ secret: 's', folder: 'doulisha/dev' });

  it('hands out a PUT link whose token carries the public id and the limits', () => {
    const form = storage.signUpload({
      publicId: 'doulisha/dev/event-cover/u/1',
      private: false,
      allowedFormats: ['jpg'],
      contentType: 'image/jpeg',
      maxBytes: 100,
      now: new Date(1_000),
    });
    expect(form.method).toBe('PUT');
    const token = form.url.replace('/api/media/upload/', '');
    expect(verifyUploadToken(token, 's', 2_000)).toMatchObject({
      key: 'doulisha/dev/event-cover/u/1',
      bucket: 'public',
      maxBytes: 100,
    });
    expect(storage.originalUrl({ publicId: 'x', format: 'jpg', private: false })).toBeNull();
  });

  it('accepts only answers signed by the local route', () => {
    const answer = {
      public_id: 'doulisha/dev/event-cover/u/1',
      version: 5,
      format: 'jpg',
      bytes: 3,
    };
    const signature = signLocalAnswer(answer, 's');
    expect(storage.verifyAnswer({ ...answer, signature })).toBe(true);
    expect(storage.verifyAnswer({ ...answer, version: 6, signature })).toBe(false);
  });
});
