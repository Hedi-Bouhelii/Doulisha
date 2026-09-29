import { describe, expect, it } from 'vitest';

import { checkAvailability, statusAfterChange } from './availability';
import { isBalanced, paymentEntries, refundEntries } from './ledger';
import { PricingError, quoteOrder, type PricedTicket } from './pricing';
import { refundAmount } from './refund-policy';
import { makeSlug } from './slug';

const tickets: PricedTicket[] = [
  {
    id: 'std',
    name: 'Standard',
    priceMillimes: 65_000,
    depositMillimes: 20_000,
    seatsPerTicket: 1,
  },
  { id: 'duo', name: 'Duo', priceMillimes: 100_000, depositMillimes: null, seatsPerTicket: 2 },
  { id: 'free', name: 'Free', priceMillimes: 0, depositMillimes: null, seatsPerTicket: 1 },
];

describe('quoteOrder', () => {
  it('prices lines, places and totals in millimes', () => {
    const quote = quoteOrder(tickets, [
      { ticketTypeId: 'std', quantity: 2 },
      { ticketTypeId: 'duo', quantity: 1 },
    ]);
    expect(quote.totalMillimes).toBe(230_000);
    expect(quote.dueNowMillimes).toBe(230_000);
    expect(quote.places).toBe(4);
    expect(quote.isDeposit).toBe(false);
  });

  it('merges repeated lines', () => {
    const quote = quoteOrder(tickets, [
      { ticketTypeId: 'std', quantity: 1 },
      { ticketTypeId: 'std', quantity: 1 },
    ]);
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0]?.quantity).toBe(2);
  });

  it('applies deposits only to ticket types that offer one (PAY-03)', () => {
    const quote = quoteOrder(
      tickets,
      [
        { ticketTypeId: 'std', quantity: 2 },
        { ticketTypeId: 'duo', quantity: 1 },
      ],
      true,
    );
    expect(quote.dueNowMillimes).toBe(2 * 20_000 + 100_000);
    expect(quote.isDeposit).toBe(true);
  });

  it('rejects empty orders, unknown tickets, bad quantities and impossible deposits', () => {
    expect(() => quoteOrder(tickets, [])).toThrow(PricingError);
    expect(() => quoteOrder(tickets, [{ ticketTypeId: 'x', quantity: 1 }])).toThrow(PricingError);
    expect(() => quoteOrder(tickets, [{ ticketTypeId: 'std', quantity: 11 }])).toThrow(
      PricingError,
    );
    expect(() => quoteOrder(tickets, [{ ticketTypeId: 'std', quantity: 1.5 }])).toThrow(
      PricingError,
    );
    expect(() => quoteOrder(tickets, [{ ticketTypeId: 'duo', quantity: 1 }], true)).toThrow(
      PricingError,
    );
  });

  it('handles free tickets', () => {
    expect(quoteOrder(tickets, [{ ticketTypeId: 'free', quantity: 3 }]).totalMillimes).toBe(0);
  });
});

describe('checkAvailability', () => {
  const stock = {
    capacity: 10,
    placesTaken: 8,
    tickets: [
      { id: 'std', quantity: 10, sold: 8 },
      { id: 'vip', quantity: 2, sold: 2 },
    ],
  };

  it('accepts requests that fit', () => {
    expect(
      checkAvailability(stock, { places: 2, lines: [{ ticketTypeId: 'std', quantity: 2 }] }, false),
    ).toEqual({
      kind: 'available',
    });
  });

  it('refuses or waitlists requests over the event capacity', () => {
    const request = { places: 3, lines: [{ ticketTypeId: 'std', quantity: 3 }] };
    expect(checkAvailability(stock, request, false)).toEqual({ kind: 'sold_out' });
    expect(checkAvailability(stock, request, true)).toEqual({ kind: 'waitlist' });
  });

  it('respects the stock of each ticket type', () => {
    expect(
      checkAvailability(stock, { places: 1, lines: [{ ticketTypeId: 'vip', quantity: 1 }] }, false),
    ).toEqual({ kind: 'sold_out' });
  });

  it('treats a null capacity as unlimited', () => {
    expect(
      checkAvailability(
        { capacity: null, placesTaken: 500, tickets: [{ id: 'std', quantity: null, sold: 500 }] },
        { places: 50, lines: [{ ticketTypeId: 'std', quantity: 50 }] },
        false,
      ),
    ).toEqual({ kind: 'available' });
  });
});

describe('statusAfterChange', () => {
  it('switches between published and full', () => {
    expect(statusAfterChange('published', 10, 10)).toBe('full');
    expect(statusAfterChange('full', 10, 9)).toBe('published');
    expect(statusAfterChange('published', 10, 9)).toBeNull();
    expect(statusAfterChange('draft', 10, 10)).toBeNull();
  });
});

describe('refundAmount (PAY-04)', () => {
  const startsAt = new Date('2026-10-10T08:00:00Z');
  const at = (iso: string) => new Date(iso);
  const base = { startsAt, paidMillimes: 65_000, cancelledByOrganizer: false };

  it('flexible: full refund up to 24 hours before', () => {
    expect(refundAmount({ ...base, policy: 'flexible', now: at('2026-10-09T08:00:00Z') })).toBe(
      65_000,
    );
    expect(refundAmount({ ...base, policy: 'flexible', now: at('2026-10-09T09:00:00Z') })).toBe(0);
  });

  it('moderate: full refund up to 7 days before', () => {
    expect(refundAmount({ ...base, policy: 'moderate', now: at('2026-10-03T07:00:00Z') })).toBe(
      65_000,
    );
    expect(refundAmount({ ...base, policy: 'moderate', now: at('2026-10-05T08:00:00Z') })).toBe(0);
  });

  it('strict: no refund unless the organizer cancels', () => {
    expect(refundAmount({ ...base, policy: 'strict', now: at('2026-09-01T00:00:00Z') })).toBe(0);
    expect(
      refundAmount({
        ...base,
        policy: 'strict',
        now: at('2026-10-10T07:00:00Z'),
        cancelledByOrganizer: true,
      }),
    ).toBe(65_000);
  });

  it('never refunds more than was paid', () => {
    expect(
      refundAmount({
        ...base,
        paidMillimes: 0,
        policy: 'flexible',
        now: at('2026-09-01T00:00:00Z'),
      }),
    ).toBe(0);
  });
});

describe('ledger', () => {
  const args = { provider: 'mock', organizerKey: 'org-1', amountMillimes: 45_000 };

  it('writes balanced payment and refund transactions', () => {
    expect(isBalanced(paymentEntries(args))).toBe(true);
    expect(isBalanced(refundEntries(args))).toBe(true);
    expect(isBalanced([...paymentEntries(args), ...refundEntries(args)])).toBe(true);
  });

  it('records money the organizer collected directly', () => {
    const [debit] = paymentEntries({ ...args, provider: 'manual' });
    expect(debit?.account).toBe('organizer:org-1:direct');
  });

  it('detects unbalanced or invalid lines', () => {
    expect(isBalanced([{ account: 'a', direction: 'debit', amountMillimes: 10 }])).toBe(false);
    expect(
      isBalanced([
        { account: 'a', direction: 'debit', amountMillimes: 1.5 },
        { account: 'b', direction: 'credit', amountMillimes: 1.5 },
      ]),
    ).toBe(false);
  });
});

describe('makeSlug', () => {
  it('builds readable ASCII slugs', () => {
    expect(makeSlug('Randonnée à Aïn Draham !', 'abc12')).toBe('randonnee-a-ain-draham-abc12');
  });

  it('falls back for titles without Latin letters', () => {
    expect(makeSlug('ورشة طبخ', 'x1y2z')).toBe('event-x1y2z');
  });

  it('adds a random suffix by default', () => {
    expect(makeSlug('Concert')).toMatch(/^concert-[a-z2-9]{5}$/);
  });
});
