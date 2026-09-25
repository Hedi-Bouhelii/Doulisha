import { describe, expect, it } from 'vitest';

import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { coverUrlFromKey } from './uploads';

const actor: Actor = { userId: 'user-1', roles: ['participant'], isAnonymous: false };
const deps = { storage: { publicUrl: (key: string) => `/uploads/${key}` } } as never;

describe('coverUrlFromKey', () => {
  it('turns the member own cover key into its public URL', () => {
    expect(coverUrlFromKey(deps, actor, 'event-cover/user-1/abc.webp')).toBe(
      '/uploads/event-cover/user-1/abc.webp',
    );
  });

  it('refuses keys of other members, other purposes and outside URLs', () => {
    for (const key of [
      'event-cover/user-2/abc.webp',
      'payment-proof/user-1/abc.pdf',
      'event-cover/user-1/../../etc/passwd',
      'http://169.254.169.254/latest/meta-data',
    ]) {
      expect(() => coverUrlFromKey(deps, actor, key)).toThrow(AppError);
    }
  });
});
