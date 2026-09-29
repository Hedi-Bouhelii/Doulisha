import { describe, expect, it } from 'vitest';

import {
  isPlaceholderEmail,
  millimesSchema,
  normalizePhone,
  phoneInputSchema,
  slugSchema,
} from './common';

describe('phone numbers', () => {
  it('normalizes Tunisian numbers to E.164', () => {
    expect(normalizePhone('20 123 456')).toBe('+21620123456');
    expect(normalizePhone('0021620123456')).toBe('+21620123456');
    expect(normalizePhone('+216 20-123-456')).toBe('+21620123456');
  });

  it('accepts valid numbers and rejects junk', () => {
    expect(phoneInputSchema.parse('98 765 432')).toBe('+21698765432');
    expect(phoneInputSchema.safeParse('12').success).toBe(false);
    expect(phoneInputSchema.safeParse('abc').success).toBe(false);
  });
});

describe('millimes', () => {
  it('accepts integer amounts only', () => {
    expect(millimesSchema.safeParse(45_000).success).toBe(true);
    expect(millimesSchema.safeParse(45.5).success).toBe(false);
    expect(millimesSchema.safeParse(-1).success).toBe(false);
  });
});

describe('slugs', () => {
  it('accepts kebab-case only', () => {
    expect(slugSchema.safeParse('randonnee-ain-draham').success).toBe(true);
    expect(slugSchema.safeParse('Ain Draham').success).toBe(false);
  });
});

describe('placeholder emails', () => {
  it('recognises phone, guest and Facebook placeholders', () => {
    expect(isPlaceholderEmail('21620000001@phone.doulisha.invalid')).toBe(true);
    expect(isPlaceholderEmail('abc@guest.doulisha.invalid')).toBe(true);
    expect(isPlaceholderEmail('1234567890@facebook.doulisha.invalid')).toBe(true);
  });

  it('leaves real addresses alone', () => {
    expect(isPlaceholderEmail('hedi@gmail.com')).toBe(false);
    expect(isPlaceholderEmail('someone@doulisha.invalid.example.com')).toBe(false);
  });
});
