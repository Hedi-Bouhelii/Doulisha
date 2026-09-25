export interface StockSnapshot {
  /** Event capacity; null means unlimited. */
  capacity: number | null;
  placesTaken: number;
  tickets: { id: string; quantity: number | null; sold: number }[];
}

export interface Request {
  places: number;
  lines: { ticketTypeId: string; quantity: number }[];
}

export type Availability =
  | { kind: 'available' }
  /** Not enough places: the buyer can join the waitlist (PRT-04). */
  | { kind: 'waitlist' }
  | { kind: 'sold_out' };

/**
 * Whether a request fits the remaining stock. Called inside the booking
 * transaction after the event and ticket rows are locked (SELECT … FOR UPDATE),
 * so two buyers can never both take the last place.
 */
export function checkAvailability(
  stock: StockSnapshot,
  request: Request,
  waitlistEnabled: boolean,
): Availability {
  const eventHasRoom =
    stock.capacity === null || stock.placesTaken + request.places <= stock.capacity;
  const ticketsHaveRoom = request.lines.every((line) => {
    const ticket = stock.tickets.find((t) => t.id === line.ticketTypeId);
    return (
      ticket !== undefined &&
      (ticket.quantity === null || ticket.sold + line.quantity <= ticket.quantity)
    );
  });
  if (eventHasRoom && ticketsHaveRoom) return { kind: 'available' };
  return waitlistEnabled ? { kind: 'waitlist' } : { kind: 'sold_out' };
}

/** Status after places change: "full" when no place is left, back to "published" otherwise. */
export function statusAfterChange(
  status: string,
  capacity: number | null,
  placesTaken: number,
): 'published' | 'full' | null {
  if (status !== 'published' && status !== 'full') return null;
  if (capacity === null) return status === 'full' ? 'published' : null;
  const next = placesTaken >= capacity ? 'full' : 'published';
  return next === status ? null : next;
}
