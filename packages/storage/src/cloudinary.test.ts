import { describe, expect, it } from 'vitest';

import {
  privateDownloadUrl,
  signParams,
  signUpload,
  stringToSign,
  verifyUploadResponse,
  type CloudinaryConfig,
} from './cloudinary';

const config: CloudinaryConfig = {
  cloudName: 'demo',
  apiKey: '1234',
  apiSecret: 'secret',
  folder: 'doulisha/dev',
};

describe('Cloudinary signatures', () => {
  it('matches the example of the Cloudinary documentation', () => {
    expect(
      signParams(
        {
          eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
          public_id: 'sample_image',
          timestamp: 1315060510,
        },
        'abcd',
      ),
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('sorts parameters, joins lists and leaves out unsigned or empty ones', () => {
    expect(
      stringToSign({
        timestamp: 10,
        allowed_formats: ['jpg', 'png'],
        public_id: 'a/b',
        api_key: 'k',
        file: 'x',
        resource_type: 'image',
        cloud_name: 'c',
        type: undefined,
        context: '',
      }),
    ).toBe('allowed_formats=jpg,png&public_id=a/b&timestamp=10');
  });

  it('escapes "&" inside values so a value cannot add a parameter', () => {
    expect(stringToSign({ public_id: 'a&timestamp=1' })).toBe('public_id=a%26timestamp=1');
    expect(stringToSign({ public_id: 'a&b' }, 1)).toBe('public_id=a&b');
  });

  it('accepts only upload answers signed with our secret', () => {
    const answer = { public_id: 'doulisha/dev/event-cover/u/1', version: 1700000000 };
    const signature = signParams(answer, config.apiSecret, 1);
    expect(verifyUploadResponse({ ...answer, signature }, config.apiSecret)).toBe(true);
    expect(verifyUploadResponse({ ...answer, signature }, 'other')).toBe(false);
    expect(
      verifyUploadResponse({ ...answer, public_id: 'doulisha/dev/x', signature }, config.apiSecret),
    ).toBe(false);
    expect(verifyUploadResponse({ ...answer, signature: 'short' }, config.apiSecret)).toBe(false);
  });
});

describe('signed uploads', () => {
  it('signs the original upload without any transformation (spec 2.2)', () => {
    const { url, fields } = signUpload(config, {
      publicId: 'doulisha/dev/event-cover/u/1',
      type: 'upload',
      allowedFormats: ['jpg', 'png', 'webp', 'heic'],
      timestamp: 1700000000,
    });
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
    expect(fields).toEqual({
      public_id: 'doulisha/dev/event-cover/u/1',
      timestamp: '1700000000',
      allowed_formats: 'jpg,png,webp,heic',
      api_key: '1234',
      signature: signParams(
        {
          public_id: 'doulisha/dev/event-cover/u/1',
          timestamp: 1700000000,
          allowed_formats: 'jpg,png,webp,heic',
        },
        'secret',
      ),
    });
    expect(Object.keys(fields).join()).not.toMatch(/transformation|eager|quality|upload_preset/);
  });

  it('marks payment proofs as authenticated assets (MED-05)', () => {
    const { fields } = signUpload(config, {
      publicId: 'doulisha/dev/payment-proof/u/1',
      type: 'authenticated',
      allowedFormats: ['jpg', 'pdf'],
      timestamp: 1,
    });
    expect(fields.type).toBe('authenticated');
  });
});

describe('private downloads', () => {
  it('builds a signed, expiring link to the original', () => {
    const link = new URL(
      privateDownloadUrl(config, {
        publicId: 'doulisha/dev/payment-proof/u/1',
        format: 'jpg',
        type: 'authenticated',
        expiresAt: 1700000060,
        timestamp: 1700000000,
      }),
    );
    expect(link.origin + link.pathname).toBe('https://api.cloudinary.com/v1_1/demo/image/download');
    const params = Object.fromEntries(link.searchParams);
    expect(params).toMatchObject({
      public_id: 'doulisha/dev/payment-proof/u/1',
      type: 'authenticated',
      expires_at: '1700000060',
      api_key: '1234',
    });
    const { signature, api_key: _apiKey, ...signed } = params;
    expect(signature).toBe(signParams(signed, 'secret'));
  });
});
