import { describe, expect, it } from 'vitest';

import { extendedDeadline, manualPaymentDeadline } from './payment-deadline';

const at = (iso: string) => new Date(iso);

describe('manualPaymentDeadline', () => {
  it('gives 48 hours when the event is far away', () => {
    expect(manualPaymentDeadline(at('2026-10-01T10:00:00Z'), at('2026-10-20T08:00:00Z'))).toEqual(
      at('2026-10-03T10:00:00Z'),
    );
  });

  it('ends 12 hours before the event when that comes first', () => {
    expect(manualPaymentDeadline(at('2026-10-01T10:00:00Z'), at('2026-10-02T20:00:00Z'))).toEqual(
      at('2026-10-02T08:00:00Z'),
    );
  });

  it('still leaves 2 hours for a late booking, never past the start', () => {
    expect(manualPaymentDeadline(at('2026-10-01T10:00:00Z'), at('2026-10-01T18:00:00Z'))).toEqual(
      at('2026-10-01T12:00:00Z'),
    );
    expect(manualPaymentDeadline(at('2026-10-01T10:00:00Z'), at('2026-10-01T11:00:00Z'))).toEqual(
      at('2026-10-01T11:00:00Z'),
    );
  });

  it('uses a shorter window to resubmit a receipt', () => {
    expect(
      manualPaymentDeadline(at('2026-10-01T10:00:00Z'), at('2026-10-20T08:00:00Z'), 24),
    ).toEqual(at('2026-10-02T10:00:00Z'));
  });
});

describe('extendedDeadline', () => {
  it('adds a day to the later of now and the current deadline', () => {
    const now = at('2026-10-01T10:00:00Z');
    expect(extendedDeadline(now, at('2026-10-02T10:00:00Z'), at('2026-10-20T08:00:00Z'))).toEqual(
      at('2026-10-03T10:00:00Z'),
    );
    expect(extendedDeadline(now, at('2026-09-30T10:00:00Z'), at('2026-10-20T08:00:00Z'))).toEqual(
      at('2026-10-02T10:00:00Z'),
    );
  });

  it('never goes past the start of the event', () => {
    expect(extendedDeadline(at('2026-10-01T10:00:00Z'), null, at('2026-10-01T20:00:00Z'))).toEqual(
      at('2026-10-01T20:00:00Z'),
    );
  });
});
