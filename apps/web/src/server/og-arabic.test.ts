import { describe, expect, it } from 'vitest';

import { shapeArabic, visualArabic } from './og-arabic';

const forms = (...codes: number[]) => String.fromCodePoint(...codes);

describe('shapeArabic', () => {
  it('picks initial, medial, final and isolated forms', () => {
    // و (isolated) ر (isolated) ش (initial) ة (final)
    expect(shapeArabic('ورشة')).toBe(forms(0xfeed, 0xfead, 0xfeb7, 0xfe94));
    // ب (initial) ت (medial) ب (final)
    expect(shapeArabic('بتب')).toBe(forms(0xfe91, 0xfe98, 0xfe90));
  });

  it('joins lam and alef into one ligature', () => {
    expect(shapeArabic('لا')).toBe(forms(0xfefb));
    // س (initial) لا (final ligature) م (isolated: alef does not join forward)
    expect(shapeArabic('سلام')).toBe(forms(0xfeb3, 0xfefc, 0xfee1));
  });

  it('shapes the Tunisian ڤ', () => {
    expect(shapeArabic('ڤڤ')).toBe(forms(0xfb6c, 0xfb6b));
  });

  it('leaves Latin text alone', () => {
    expect(shapeArabic('Tunis 2026')).toBe('Tunis 2026');
  });
});

describe('visualArabic', () => {
  it('reverses a shaped word for left-to-right drawing', () => {
    expect(visualArabic('ورشة')).toBe(forms(0xfe94, 0xfeb7, 0xfead, 0xfeed));
  });

  it('keeps numbers and times readable', () => {
    expect(visualArabic('10:00')).toBe('10:00');
    expect(visualArabic('2026')).toBe('2026');
  });

  it('mirrors brackets', () => {
    expect(visualArabic('(ب)')).toBe(`(${forms(0xfe8f)})`);
  });
});
