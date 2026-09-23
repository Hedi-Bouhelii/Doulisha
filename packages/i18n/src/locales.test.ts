import { describe, expect, it } from 'vitest';

import { defaultLocale, getDirection, isLocale, locales } from './locales';

describe('locales', () => {
  it('supports Arabic, French and English', () => {
    expect(locales).toEqual(['ar', 'fr', 'en']);
    expect(isLocale(defaultLocale)).toBe(true);
  });

  it('only accepts supported locale codes', () => {
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale('')).toBe(false);
  });

  it('uses right-to-left for Arabic only', () => {
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('fr')).toBe('ltr');
    expect(getDirection('en')).toBe('ltr');
  });
});
