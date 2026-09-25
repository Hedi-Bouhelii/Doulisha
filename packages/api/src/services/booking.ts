import { randomInt } from 'node:crypto';

import type { Executor, Tx } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import type { CreateBookingInput } from '@doulisha/validators';
import { and, asc, eq, max } from 'drizzle-orm';

import { checkAvailability } from '../domain/availability';
import { PricingError, quoteOrder } from '../domain/pricing';
import type { ServiceDeps } from '../deps';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { startPayment } from './payments';
import { HOLD_MINUTES, lockEventStock, releaseExpired, movePlaces } from './stock';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length: number) {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export type PaymentChoice = 'online' | 'd17' | 'bank_transfer' | 'cash';

/** Payment methods a registration type accepts (PAY-02). */
export function allowedPayments(registrationType: string): PaymentChoice[] {
  switch (registrationType) {
    case 'paid':
    case 'deposit':
      return ['online', 'd17', 'bank_transfer'];
    case 'pay_at_door':
      return ['cash', 'online'];
    default:
      return [];
  }
}

/** Events that accept bookings right now. */
export function assertBookable(event: typeof schema.events.$inferSelect, now = new Date()): void {
  const open =
    (event.status === 'published' || event.status === 'full') &&
    event.visibility !== 'private' &&
    event.deletedAt === null &&
    event.startsAt > now &&
    (event.bookingOpensAt === null || event.bookingOpensAt <= now) &&
    (event.bookingClosesAt === null || event.bookingClosesAt > now);
  if (!open) throw new AppError('BAD_REQUEST', 'errors.eventNotBookable');
}

export interface BookingResult {
  reference: string;
  status: 'confirmed' | 'awaiting_payment' | 'waitlisted';
  /** Online payment: where to send the buyer. */
  redirectUrl?: string;
}

async function findByIdempotencyKey(db: Executor, key: string) {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.idempotencyKey, key))
    .limit(1);
  return order;
}

/**
 * PAY-01 checkout. One transaction locks the event's stock, releases expired
 * holds, prices the order and either books places or joins the waitlist.
 * The online payment is created after the transaction commits, so no lock is
 * held while talking to the gateway.
 */
export async function createBooking(
  db: Executor,
  deps: ServiceDeps,
  actor: Actor | null,
  input: CreateBookingInput,
  locale: Locale,
  now = new Date(),
): Promise<BookingResult> {
  if (!actor) throw new AppError('UNAUTHORIZED', 'errors.signInRequired');

  const existing = await findByIdempotencyKey(db, input.idempotencyKey);
  if (existing) {
    if (existing.buyerId !== actor.userId) throw new AppError('CONFLICT', 'errors.generic');
    return { reference: existing.reference, status: summarizeStatus(existing.status) };
  }

  const created = await deps.transaction((tx) => bookInTransaction(tx, actor, input, now));

  if (created.paymentToStart) {
    const redirectUrl = await startPayment(db, deps, {
      paymentId: created.paymentToStart.id,
      reference: created.reference,
      amountMillimes: created.paymentToStart.amountMillimes,
      locale,
    });
    return { reference: created.reference, status: 'awaiting_payment', redirectUrl };
  }
  return { reference: created.reference, status: created.status };
}

function summarizeStatus(orderStatus: string): BookingResult['status'] {
  if (orderStatus === 'pending') return 'waitlisted';
  if (orderStatus === 'awaiting_payment' || orderStatus === 'partially_paid') {
    return 'awaiting_payment';
  }
  return 'confirmed';
}

async function bookInTransaction(tx: Tx, actor: Actor, input: CreateBookingInput, now: Date) {
  const stock = await lockEventStock(tx, input.eventId);
  if (!stock) throw new AppError('NOT_FOUND', 'errors.notFound');
  const { event } = stock;
  assertBookable(event, now);
  await releaseExpired(tx, stock, now);

  let quote;
  try {
    quote = quoteOrder(
      stock.tickets
        .filter((t) => t.isActive)
        .map((t) => ({
          id: t.id,
          name: t.name,
          priceMillimes: t.priceMillimes,
          depositMillimes: t.depositMillimes,
          seatsPerTicket: t.seatsPerTicket,
        })),
      input.lines,
      input.payDeposit,
    );
  } catch (error) {
    if (error instanceof PricingError) throw new AppError('BAD_REQUEST', 'errors.invalidTickets');
    throw error;
  }

  if (input.attendees.length !== quote.places) {
    throw new AppError('BAD_REQUEST', 'errors.attendeesMismatch', { places: quote.places });
  }

  const points = await tx
    .select({ id: schema.meetingPoints.id })
    .from(schema.meetingPoints)
    .where(eq(schema.meetingPoints.eventId, event.id));
  if (points.length > 0 && !points.some((p) => p.id === input.meetingPointId)) {
    throw new AppError('BAD_REQUEST', 'errors.meetingPointRequired');
  }

  const questions = await tx
    .select()
    .from(schema.bookingQuestions)
    .where(eq(schema.bookingQuestions.eventId, event.id));
  for (const q of questions) {
    const answer = input.answers[q.id]?.trim();
    if (q.required && !answer) throw new AppError('BAD_REQUEST', 'errors.answerRequired');
    if (answer && q.type === 'select' && !q.options.includes(answer)) {
      throw new AppError('BAD_REQUEST', 'errors.answerRequired');
    }
  }

  const due = quote.dueNowMillimes;
  const payment = due > 0 ? input.payment : null;
  if (due > 0 && (!payment || !allowedPayments(event.registrationType).includes(payment))) {
    throw new AppError('BAD_REQUEST', 'errors.paymentMethod');
  }
  if (quote.isDeposit && event.registrationType !== 'deposit') {
    throw new AppError('BAD_REQUEST', 'errors.paymentMethod');
  }

  const availability = checkAvailability(
    { capacity: event.capacity, placesTaken: event.placesTaken, tickets: stock.tickets },
    { places: quote.places, lines: quote.lines },
    event.waitlistEnabled,
  );
  if (availability.kind === 'sold_out') throw new AppError('CONFLICT', 'errors.soldOut');
  const waitlisted = availability.kind === 'waitlist';

  let waitlistPosition: number | null = null;
  if (waitlisted) {
    const [row] = await tx
      .select({ last: max(schema.bookings.waitlistPosition) })
      .from(schema.bookings)
      .where(eq(schema.bookings.eventId, event.id));
    waitlistPosition = (row?.last ?? 0) + 1;
  }

  const online = payment === 'online';
  const orderStatus = waitlisted ? 'pending' : due === 0 ? 'paid' : 'awaiting_payment';
  const bookingStatus = waitlisted ? 'waitlisted' : online ? 'held' : 'confirmed';
  const reference = `DLS-${randomCode(6)}`;

  const [order] = await tx
    .insert(schema.orders)
    .values({
      reference,
      buyerId: actor.userId,
      eventId: event.id,
      status: orderStatus,
      totalMillimes: quote.totalMillimes,
      paidMillimes: 0,
      balanceDueAt: quote.isDeposit
        ? new Date(Math.max(now.getTime(), event.startsAt.getTime() - 48 * 3_600_000))
        : null,
      idempotencyKey: input.idempotencyKey,
      utm: input.utm,
    })
    .returning();
  if (!order) throw new Error('Order insert failed');

  let attendeeIndex = 0;
  for (const line of quote.lines) {
    const [booking] = await tx
      .insert(schema.bookings)
      .values({
        orderId: order.id,
        eventId: event.id,
        ticketTypeId: line.ticketTypeId,
        meetingPointId: input.meetingPointId ?? null,
        quantity: line.quantity,
        places: line.places,
        status: bookingStatus,
        holdExpiresAt:
          online && !waitlisted ? new Date(now.getTime() + HOLD_MINUTES * 60_000) : null,
        waitlistPosition,
      })
      .returning();
    if (!booking) throw new Error('Booking insert failed');
    if (!waitlisted) await movePlaces(tx, stock, booking, 1);

    const people = input.attendees.slice(attendeeIndex, attendeeIndex + line.places);
    attendeeIndex += line.places;
    await tx.insert(schema.attendees).values(
      people.map((person, i) => ({
        bookingId: booking.id,
        eventId: event.id,
        // The first person is the buyer; their answers and account go on their ticket.
        userId: attendeeIndex - line.places + i === 0 ? actor.userId : null,
        fullName: person.fullName,
        phone: person.phone ?? null,
        email: person.email ?? null,
        answers: attendeeIndex - line.places + i === 0 ? input.answers : {},
        ticketCode: randomCode(12),
      })),
    );
  }

  let paymentToStart: { id: string; amountMillimes: number } | null = null;
  if (!waitlisted && due > 0 && payment) {
    const [row] = await tx
      .insert(schema.payments)
      .values({
        orderId: order.id,
        provider: online ? 'mock' : 'manual',
        method: online ? 'card' : payment,
        amountMillimes: due,
      })
      .returning();
    if (online && row) paymentToStart = { id: row.id, amountMillimes: due };
  }

  return {
    reference,
    status: (waitlisted
      ? 'waitlisted'
      : due > 0
        ? 'awaiting_payment'
        : 'confirmed') as BookingResult['status'],
    paymentToStart,
  };
}

/** Checkout data for an event page (tickets, questions, meeting points, methods). */
export async function getCheckoutOptions(db: Executor, eventId: string) {
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
  if (!event || event.visibility === 'private') throw new AppError('NOT_FOUND', 'errors.notFound');
  const [tickets, questions, points] = await Promise.all([
    db
      .select()
      .from(schema.ticketTypes)
      .where(and(eq(schema.ticketTypes.eventId, eventId), eq(schema.ticketTypes.isActive, true)))
      .orderBy(asc(schema.ticketTypes.sort)),
    db
      .select()
      .from(schema.bookingQuestions)
      .where(eq(schema.bookingQuestions.eventId, eventId))
      .orderBy(asc(schema.bookingQuestions.sort)),
    db
      .select()
      .from(schema.meetingPoints)
      .where(eq(schema.meetingPoints.eventId, eventId))
      .orderBy(asc(schema.meetingPoints.sort)),
  ]);
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.placesTaken);
  return {
    eventId: event.id,
    registrationType: event.registrationType,
    waitlistEnabled: event.waitlistEnabled,
    placesLeft: left,
    payments: allowedPayments(event.registrationType),
    tickets: tickets.map((t) => ({
      id: t.id,
      kind: t.kind,
      name: t.name,
      description: t.description,
      priceMillimes: t.priceMillimes,
      depositMillimes: t.depositMillimes,
      seatsPerTicket: t.seatsPerTicket,
      left: t.quantity === null ? null : Math.max(0, t.quantity - t.sold),
    })),
    questions: questions.map((q) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      options: q.options,
      required: q.required,
    })),
    meetingPoints: points.map((p) => ({ id: p.id, name: p.name, meetAt: p.meetAt })),
  };
}
