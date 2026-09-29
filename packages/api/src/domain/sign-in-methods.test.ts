import { describe, expect, it } from 'vitest';

import { canRemoveProvider, type SignInMethods } from './sign-in-methods';

const linkedAt = new Date('2026-09-29T10:00:00Z');
const googleOnly: SignInMethods = {
  phone: null,
  email: null,
  hasPassword: false,
  providers: [{ providerId: 'google', linkedAt }],
};

describe('removing a social account', () => {
  it('refuses the last way to sign in', () => {
    expect(canRemoveProvider(googleOnly, 'google')).toBe(false);
  });

  it('allows it when a phone, an email or a password remains', () => {
    expect(canRemoveProvider({ ...googleOnly, phone: '+21620000001' }, 'google')).toBe(true);
    expect(canRemoveProvider({ ...googleOnly, email: 'hedi@gmail.com' }, 'google')).toBe(true);
    expect(canRemoveProvider({ ...googleOnly, hasPassword: true }, 'google')).toBe(true);
  });

  it('allows it when another social account remains', () => {
    const both: SignInMethods = {
      ...googleOnly,
      providers: [...googleOnly.providers, { providerId: 'facebook', linkedAt }],
    };
    expect(canRemoveProvider(both, 'google')).toBe(true);
    expect(canRemoveProvider(both, 'facebook')).toBe(true);
  });

  it('refuses a provider that is not connected', () => {
    expect(canRemoveProvider({ ...googleOnly, hasPassword: true }, 'facebook')).toBe(false);
  });
});
