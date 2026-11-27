import { createLocalMediaStorage, signLocalAnswer } from '@doulisha/storage';
import { describe, expect, it } from 'vitest';

import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { assertValidAnswer, requireUploader, toMediaRef, type MediaRow } from './media';

const member: Actor = { userId: 'user-1', roles: ['participant'], isAnonymous: false };
const guest: Actor = { userId: 'guest-1', roles: [], isAnonymous: true };
const deps = { media: createLocalMediaStorage({ secret: 's', folder: 'doulisha/dev' }) };

function answer(overrides: Record<string, unknown> = {}) {
  const base = {
    public_id: 'doulisha/dev/event-cover/user-1/abc',
    version: 1700000000,
    width: 4000,
    height: 3000,
    format: 'jpg',
    bytes: 1234,
    ...overrides,
  };
  return { ...base, signature: signLocalAnswer(base, 's') };
}

function code(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error instanceof AppError ? error.message : 'not an AppError';
  }
  return 'no error';
}

describe('who may upload (spec 2.3 step 1)', () => {
  it('needs an account, except guests sending a payment proof', () => {
    expect(code(() => requireUploader(null, 'event-cover'))).toBe('errors.signInRequired');
    expect(code(() => requireUploader(guest, 'event-cover'))).toBe('errors.signInRequired');
    expect(requireUploader(guest, 'payment-proof')).toBe(guest);
    expect(requireUploader(member, 'organizer-logo')).toBe(member);
  });
});

describe('checking the storage answer (spec 2.3 step 3)', () => {
  it('accepts a signed answer for the member own upload', () => {
    expect(code(() => assertValidAnswer(deps, member, 'event-cover', answer(), 1234))).toBe(
      'no error',
    );
  });

  it('refuses forged or altered answers', () => {
    const forged = { ...answer(), version: 1700000001 };
    expect(code(() => assertValidAnswer(deps, member, 'event-cover', forged, 1234))).toBe(
      'errors.generic',
    );
  });

  it('refuses files uploaded by someone else or for another purpose', () => {
    const other = answer({ public_id: 'doulisha/dev/event-cover/user-2/abc' });
    expect(code(() => assertValidAnswer(deps, member, 'event-cover', other, 1234))).toBe(
      'errors.forbidden',
    );
    expect(code(() => assertValidAnswer(deps, member, 'organizer-logo', answer(), 1234))).toBe(
      'errors.forbidden',
    );
  });

  it('refuses a stored file whose size differs from the original (Q1)', () => {
    expect(code(() => assertValidAnswer(deps, member, 'event-cover', answer(), 1235))).toBe(
      'errors.generic',
    );
  });

  it('refuses formats the kind does not accept', () => {
    const pdf = answer({ format: 'pdf' });
    expect(code(() => assertValidAnswer(deps, member, 'event-cover', pdf, 1234))).toBe(
      'errors.fileType',
    );
    const proof = answer({ public_id: 'doulisha/dev/payment-proof/user-1/abc', format: 'pdf' });
    expect(code(() => assertValidAnswer(deps, member, 'payment-proof', proof, 1234))).toBe(
      'no error',
    );
  });
});

describe('media references', () => {
  it('describe the stored original, never a URL', () => {
    const row = {
      provider: 'cloudinary',
      key: 'doulisha/dev/event-cover/user-1/abc',
      version: 3,
      format: 'heic',
      width: 3024,
      height: 4032,
      crop: { x: 0, y: 500, w: 3024, h: 3024 },
    } as MediaRow;
    expect(toMediaRef(row)).toEqual({
      provider: 'cloudinary',
      key: 'doulisha/dev/event-cover/user-1/abc',
      version: 3,
      format: 'heic',
      width: 3024,
      height: 4032,
      crop: { x: 0, y: 500, w: 3024, h: 3024 },
    });
  });
});
