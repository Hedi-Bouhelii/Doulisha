import { describe, expect, it } from 'vitest';

import { formatPercent, fromTunisInput, toTunisInput } from './format';

describe('Tunisia datetime-local values', () => {
  it('shows an instant in Tunisia time', () => {
    expect(toTunisInput(new Date('2026-10-03T06:00:00Z'))).toBe('2026-10-03T07:00');
  });

  it('reads a value as Tunisia time', () => {
    expect(fromTunisInput('2026-10-03T07:00')?.toISOString()).toBe('2026-10-03T06:00:00.000Z');
  });

  it('round-trips across midnight', () => {
    const date = new Date('2026-12-31T23:30:00Z');
    expect(fromTunisInput(toTunisInput(date))?.getTime()).toBe(date.getTime());
  });

  it('rejects empty or malformed values', () => {
    expect(fromTunisInput('')).toBeNull();
    expect(fromTunisInput('2026-10-03')).toBeNull();
  });
});

describe('formatPercent', () => {
  it('rounds to whole percents', () => {
    expect(formatPercent(0.426, 'en')).toBe('43%');
  });
});
