import type { Tx } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { statusAfterChange } from '../domain/availability';

/** How long an unpaid online booking keeps its places (NFR peak load: holds with expiry). */
export const HOLD_MINUTES = 15;
/** How long a waitlist offer stays open (PRT-04). */
export const OFFER_HOURS = 24;

/**
 * Locks the event row and its ticket types for the rest of the transaction
 * (SELECT … FOR UPDATE). Every change to places goes through this lock, so
 * concurrent buyers are served one after another and stock never goes negative.
 */
export async function lockEventStock(tx: Tx, eventId: string) {
  const [event] = await tx
    .select()
    .from(schema.events)
    .where(eq(schema.events.id, eventId))
    .for('update');
  if (!event) return null;
  const tickets = await tx
    .select()
    .from(schema.ticketTypes)
    .where(eq(schema.ticketTypes.eventId, eventId))
    .orderBy(asc(schema.ticketTypes.sort))
    .for('update');
  return { event, tickets };
}

export type LockedStock = NonNullable<Awaited<ReturnType<typeof lockEventStock>>>;

/**
 * Adds (`sign` = 1) or removes (`sign` = -1) a booking's places and tickets,
 * and switches the event between "published" and "full". Requires the lock.
 */
export async function movePlaces(
  tx: Tx,
  stock: LockedStock,
  booking: { places: number; ticketTypeId: string | null; quantity: number },
  sign: 1 | -1,
) {
  const placesTaken = Math.max(0, stock.event.placesTaken + sign * booking.places);
  const nextStatus = statusAfterChange(stock.event.status, stock.event.capacity, placesTaken);
  await tx
    .update(schema.events)
    .set({ placesTaken, ...(nextStatus ? { status: nextStatus } : {}) })
    .where(eq(schema.events.id, stock.event.id));
  stock.event.placesTaken = placesTaken;
  if (nextStatus) stock.event.status = nextStatus;

  if (booking.ticketTypeId) {
    const ticket = stock.tickets.find((t) => t.id === booking.ticketTypeId);
    if (ticket) {
      ticket.sold = Math.max(0, ticket.sold + sign * booking.quantity);
      await tx
        .update(schema.ticketTypes)
        .set({ sold: ticket.sold })
        .where(eq(schema.ticketTypes.id, ticket.id));
    }
  }
}

/**
 * Releases unpaid holds and unanswered waitlist offers whose time is up, then
 * offers the freed places to the waitlist. Called at the start of every
 * booking transaction, so no background job is needed for correctness.
 */
export async function releaseExpired(tx: Tx, stock: LockedStock, now = new Date()) {
  const expired = await tx
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.eventId, stock.event.id),
        sql`(${schema.bookings.status} = 'held' and ${schema.bookings.holdExpiresAt} < ${now})
          or (${schema.bookings.status} = 'offered' and ${schema.bookings.offerExpiresAt} < ${now})`,
      ),
    );
  for (const booking of expired) {
    await tx
      .update(schema.bookings)
      .set({ status: 'expired' })
      .where(eq(schema.bookings.id, booking.id));
    await movePlaces(tx, stock, booking, -1);
    await tx
      .update(schema.orders)
      .set({ status: 'expired' })
      .where(
        and(
          eq(schema.orders.id, booking.orderId),
          inArray(schema.orders.status, ['pending', 'awaiting_payment']),
        ),
      );
  }
  if (expired.length > 0) await offerFreedPlaces(tx, stock, now);
  return expired.length;
}

/**
 * PRT-04: offers freed places to the waitlist in order. An offered booking
 * reserves its places for OFFER_HOURS; the buyer then confirms and pays.
 * Returns the bookings that received an offer (to notify them).
 */
export async function offerFreedPlaces(tx: Tx, stock: LockedStock, now = new Date()) {
  if (stock.event.capacity === null) return [];
  const waiting = await tx
    .select()
    .from(schema.bookings)
    .where(
      and(eq(schema.bookings.eventId, stock.event.id), eq(schema.bookings.status, 'waitlisted')),
    )
    .orderBy(asc(schema.bookings.waitlistPosition), asc(schema.bookings.createdAt));

  const offered: (typeof waiting)[number][] = [];
  for (const booking of waiting) {
    const left = stock.event.capacity - stock.event.placesTaken;
    const ticket = stock.tickets.find((t) => t.id === booking.ticketTypeId);
    const ticketLeft = ticket?.quantity == null ? Infinity : ticket.quantity - ticket.sold;
    // Strict order: stop at the first booking that does not fit.
    if (booking.places > left || booking.quantity > ticketLeft) break;
    await tx
      .update(schema.bookings)
      .set({
        status: 'offered',
        offerExpiresAt: new Date(now.getTime() + OFFER_HOURS * 3_600_000),
      })
      .where(eq(schema.bookings.id, booking.id));
    await movePlaces(tx, stock, booking, 1);
    offered.push(booking);
  }
  return offered;
}

/** Bookings of an order, for status changes. */
export function orderBookings(tx: Tx, orderId: string) {
  return tx.select().from(schema.bookings).where(eq(schema.bookings.orderId, orderId));
}

/** Holds that expire before `now` are no longer valid for payment. */
export function isHoldValid(
  booking: { status: string; holdExpiresAt: Date | null },
  now = new Date(),
) {
  return (
    booking.status !== 'held' || (booking.holdExpiresAt !== null && booking.holdExpiresAt > now)
  );
}
