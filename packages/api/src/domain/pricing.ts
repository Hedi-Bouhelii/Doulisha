/** A ticket type as seen by the checkout (prices in millimes). */
export interface PricedTicket {
  id: string;
  name: string;
  priceMillimes: number;
  depositMillimes: number | null;
  seatsPerTicket: number;
}

export interface OrderLineInput {
  ticketTypeId: string;
  quantity: number;
}

export interface OrderQuote {
  lines: {
    ticketTypeId: string;
    name: string;
    quantity: number;
    places: number;
    unitMillimes: number;
    totalMillimes: number;
    depositMillimes: number | null;
  }[];
  places: number;
  totalMillimes: number;
  /** What the buyer pays now: the deposit when chosen and offered, else the total. */
  dueNowMillimes: number;
  /** True when the buyer pays a deposit now and the balance later (PAY-03). */
  isDeposit: boolean;
}

export class PricingError extends Error {
  constructor(readonly reason: 'unknown_ticket' | 'empty' | 'quantity' | 'no_deposit') {
    super(reason);
    this.name = 'PricingError';
  }
}

/** Largest number of tickets of one type in a single order. */
export const MAX_TICKETS_PER_LINE = 10;

/**
 * Prices an order. Pure: all money is integer millimes, so totals are exact.
 * A deposit applies line by line (types without a deposit are paid in full).
 */
export function quoteOrder(
  tickets: readonly PricedTicket[],
  lines: readonly OrderLineInput[],
  payDeposit = false,
): OrderQuote {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 0) throw new PricingError('quantity');
    merged.set(line.ticketTypeId, (merged.get(line.ticketTypeId) ?? 0) + line.quantity);
  }
  const quoted: OrderQuote['lines'] = [];
  for (const [ticketTypeId, quantity] of merged) {
    if (quantity === 0) continue;
    if (quantity > MAX_TICKETS_PER_LINE) throw new PricingError('quantity');
    const ticket = tickets.find((t) => t.id === ticketTypeId);
    if (!ticket) throw new PricingError('unknown_ticket');
    quoted.push({
      ticketTypeId,
      name: ticket.name,
      quantity,
      places: quantity * ticket.seatsPerTicket,
      unitMillimes: ticket.priceMillimes,
      totalMillimes: quantity * ticket.priceMillimes,
      depositMillimes: ticket.depositMillimes,
    });
  }
  if (quoted.length === 0) throw new PricingError('empty');

  const totalMillimes = quoted.reduce((sum, l) => sum + l.totalMillimes, 0);
  const hasDeposit = quoted.some((l) => l.depositMillimes !== null && l.depositMillimes > 0);
  if (payDeposit && !hasDeposit) throw new PricingError('no_deposit');
  const dueNowMillimes = payDeposit
    ? quoted.reduce(
        (sum, l) =>
          sum +
          (l.depositMillimes !== null && l.depositMillimes > 0
            ? Math.min(l.depositMillimes, l.unitMillimes) * l.quantity
            : l.totalMillimes),
        0,
      )
    : totalMillimes;

  return {
    lines: quoted,
    places: quoted.reduce((sum, l) => sum + l.places, 0),
    totalMillimes,
    dueNowMillimes,
    isDeposit: payDeposit && dueNowMillimes < totalMillimes,
  };
}
