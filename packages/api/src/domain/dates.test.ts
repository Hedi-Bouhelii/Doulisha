import { describe, expect, it } from 'vitest';

import { whenRange } from './dates';

describe('whenRange (Tunisia time)', () => {
  // Thursday 24 September 2026, 10:00 in Tunis (09:00 UTC).
  const thursday = new Date('2026-09-24T09:00:00Z');

  it('today runs from now until midnight in Tunis', () => {
    const { from, to } = whenRange('today', thursday);
    expect(from.toISOString()).toBe('2026-09-24T09:00:00.000Z');
    expect(to.toISOString()).toBe('2026-09-24T23:00:00.000Z');
  });

  it('tonight runs from 18:00 to 04:00 Tunis time', () => {
    const { from, to } = whenRange('tonight', thursday);
    expect(from.toISOString()).toBe('2026-09-24T17:00:00.000Z');
    expect(to.toISOString()).toBe('2026-09-25T03:00:00.000Z');
  });

  it('the weekend is Friday evening to Sunday midnight', () => {
    const { from, to } = whenRange('weekend', thursday);
    expect(from.toISOString()).toBe('2026-09-25T17:00:00.000Z');
    expect(to.toISOString()).toBe('2026-09-27T23:00:00.000Z');
  });

  it('on Sunday the weekend is the current one, starting now', () => {
    const sunday = new Date('2026-09-27T12:00:00Z');
    const { from, to } = whenRange('weekend', sunday);
    expect(from).toEqual(sunday);
    expect(to.toISOString()).toBe('2026-09-27T23:00:00.000Z');
  });

  it('handles the late evening when UTC and Tunis dates differ', () => {
    // 23:30 Tunis on Thursday is still Thursday locally.
    const late = new Date('2026-09-24T22:30:00Z');
    expect(whenRange('today', late).to.toISOString()).toBe('2026-09-24T23:00:00.000Z');
  });
});
