import { describe, expect, it } from 'vitest';

import {
  dinarsToMillimes,
  formatDate,
  formatEventDateTime,
  formatPrice,
  formatTime,
} from './format';

const nbsp = '\u00a0';

describe('formatPrice', () => {
  it('shows whole dinars without decimals', () => {
    expect(formatPrice(45_000, 'fr')).toBe(`45${nbsp}DT`);
    expect(formatPrice(45_000, 'en')).toBe(`45${nbsp}DT`);
    expect(formatPrice(45_000, 'ar')).toBe(`45${nbsp}د.ت`);
  });

  it('shows millimes with the locale decimal separator', () => {
    expect(formatPrice(12_500, 'fr')).toBe(`12,5${nbsp}DT`);
    expect(formatPrice(12_500, 'en')).toBe(`12.5${nbsp}DT`);
    expect(formatPrice(1_250, 'fr')).toBe(`1,25${nbsp}DT`);
  });

  it('uses Latin digits in Arabic, as in Tunisia', () => {
    expect(formatPrice(60_000, 'ar')).toMatch(/^60/);
  });

  it('rejects non-integer millimes', () => {
    expect(() => formatPrice(10.5, 'fr')).toThrow(RangeError);
  });
});

describe('dinarsToMillimes', () => {
  it('converts and rounds', () => {
    expect(dinarsToMillimes(45)).toBe(45_000);
    expect(dinarsToMillimes(0.1 + 0.2)).toBe(300);
  });
});

describe('dates in Africa/Tunis', () => {
  // 06:00 UTC on 26 April 2026 is 07:00 in Tunis (UTC+1, no daylight saving).
  const date = new Date('2026-04-26T06:00:00Z');

  it('formats the time in Tunisia regardless of the machine time zone', () => {
    expect(formatTime(date, 'fr')).toBe('07:00');
    expect(formatTime(date, 'ar')).toBe('07:00');
  });

  it('formats card dates with weekday and time', () => {
    expect(formatEventDateTime(date, 'en')).toBe('Sun 26 Apr · 07:00');
    expect(formatEventDateTime(date, 'fr')).toMatch(/^dim\. 26 avr\. · 07:00$/);
  });

  it('formats long dates', () => {
    expect(formatDate(date, 'fr')).toBe('26 avril 2026');
    expect(formatDate(date, 'en')).toBe('26 April 2026');
  });

  it('handles the day boundary in Tunisia time', () => {
    // 23:30 UTC on 30 April is already 1 May in Tunis.
    expect(formatDate(new Date('2026-04-30T23:30:00Z'), 'en')).toBe('1 May 2026');
  });
});
