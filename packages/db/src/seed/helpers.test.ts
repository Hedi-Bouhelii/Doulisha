import { describe, expect, it } from 'vitest';

import { dt, nextWeekday, orderReference, tunisDate } from './helpers';

describe('seed helpers', () => {
  const base = new Date('2026-09-24T10:00:00Z'); // a Thursday

  it('builds dates in Tunisia time (UTC+1)', () => {
    expect(tunisDate(base, 2, '07:00').toISOString()).toBe('2026-09-26T06:00:00.000Z');
    expect(tunisDate(base, 0, '00:30').toISOString()).toBe('2026-09-23T23:30:00.000Z');
  });

  it('finds the next Saturday', () => {
    expect(nextWeekday(base, 6)).toBe(2);
    expect(nextWeekday(base, 6, 3)).toBe(9);
  });

  it('makes readable references and converts dinars', () => {
    expect(orderReference()).toMatch(/^DLS-[A-HJ-NP-Z2-9]{6}$/);
    expect(dt(45)).toBe(45_000);
    expect(dt(12.5)).toBe(12_500);
  });
});
