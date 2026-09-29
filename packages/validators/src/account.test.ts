import { describe, expect, it } from 'vitest';

import { completeSignUpSchema, organizerProfileInputSchema, passwordSchema } from './events';

describe('passwords (ADR 0016)', () => {
  it('needs at least 8 characters', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('long-enough').success).toBe(true);
  });

  it('lets accounts that already have a password finish sign-up without one', () => {
    const parsed = completeSignUpSchema.safeParse({ name: 'Sami', accountType: 'organizer' });
    expect(parsed.success).toBe(true);
  });
});

describe('organizer profile links', () => {
  const base = { name: 'Club', legalStatus: 'association' as const };

  it('accepts web links', () => {
    const parsed = organizerProfileInputSchema.safeParse({
      ...base,
      socialLinks: { instagram: 'https://instagram.com/club' },
    });
    expect(parsed.success).toBe(true);
  });

  it('refuses scripts and other schemes', () => {
    for (const link of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com']) {
      const parsed = organizerProfileInputSchema.safeParse({
        ...base,
        socialLinks: { facebook: link },
      });
      expect(parsed.success).toBe(false);
    }
  });

  it('keeps only digits and spaces in a RIB', () => {
    const bad = organizerProfileInputSchema.safeParse({
      ...base,
      paymentInstructions: { rib: '08 000 <b>' },
    });
    expect(bad.success).toBe(false);
  });
});
