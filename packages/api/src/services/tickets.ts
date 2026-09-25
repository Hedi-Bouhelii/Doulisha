import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { refundAmount } from '../domain/refund-policy';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { attendeePayment } from './organizer-tools';
import { getOwnOrder } from './payments';

/** The buyer's orders, newest event first ("My tickets"). */
export async function listMyOrders(db: Executor, actor: Actor | null) {
  if (!actor) throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
  return db
    .select({
      reference: schema.orders.reference,
      status: schema.orders.status,
      totalMillimes: schema.orders.totalMillimes,
      paidMillimes: schema.orders.paidMillimes,
      createdAt: schema.orders.createdAt,
      event: {
        slug: schema.events.slug,
        title: schema.events.title,
        startsAt: schema.events.startsAt,
        city: schema.events.city,
        coverUrl: schema.events.coverUrl,
      },
    })
    .from(schema.orders)
    .innerJoin(schema.events, eq(schema.events.id, schema.orders.eventId))
    .where(eq(schema.orders.buyerId, actor.userId))
    .orderBy(desc(schema.events.startsAt));
}

/**
 * One order with its tickets (TKT-04): QR codes only for confirmed bookings,
 * payment state, what is still due, pending proof, and the refund the buyer
 * would get if they cancelled now (PAY-04).
 */
export async function getMyOrder(
  db: Executor,
  actor: Actor | null,
  reference: string,
  now = new Date(),
) {
  const order = await getOwnOrder(db, actor, reference);
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, order.eventId!));
  if (!event) throw new AppError('NOT_FOUND', 'errors.notFound');
  const bookings = await db
    .select({
      booking: schema.bookings,
      ticketName: schema.ticketTypes.name,
      meetingPoint: schema.meetingPoints.name,
      meetAt: schema.meetingPoints.meetAt,
    })
    .from(schema.bookings)
    .leftJoin(schema.ticketTypes, eq(schema.ticketTypes.id, schema.bookings.ticketTypeId))
    .leftJoin(schema.meetingPoints, eq(schema.meetingPoints.id, schema.bookings.meetingPointId))
    .where(eq(schema.bookings.orderId, order.id));
  const attendees = await db
    .select()
    .from(schema.attendees)
    .where(
      inArray(
        schema.attendees.bookingId,
        bookings.map((b) => b.booking.id),
      ),
    )
    .orderBy(asc(schema.attendees.createdAt));
  const payments = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.orderId, order.id))
    .orderBy(desc(schema.payments.createdAt));
  const proofs = payments.length
    ? await db
        .select({ status: schema.paymentProofs.status })
        .from(schema.paymentProofs)
        .where(
          inArray(
            schema.paymentProofs.paymentId,
            payments.map((p) => p.id),
          ),
        )
    : [];
  const [refund] = await db
    .select()
    .from(schema.refunds)
    .where(eq(schema.refunds.orderId, order.id))
    .orderBy(desc(schema.refunds.createdAt))
    .limit(1);

  const status = bookings[0]?.booking.status ?? 'cancelled';
  const pendingManual = payments.find((p) => p.status === 'pending' && p.provider === 'manual');
  const canCancel =
    ['pending', 'awaiting_payment', 'partially_paid', 'paid'].includes(order.status) &&
    event.startsAt > now;

  return {
    reference: order.reference,
    orderStatus: order.status,
    bookingStatus: status,
    payment: attendeePayment(order, status),
    totalMillimes: order.totalMillimes,
    paidMillimes: order.paidMillimes,
    dueMillimes: Math.max(0, order.totalMillimes - order.paidMillimes),
    balanceDueAt: order.balanceDueAt,
    holdExpiresAt: bookings.find((b) => b.booking.status === 'held')?.booking.holdExpiresAt ?? null,
    offerExpiresAt:
      bookings.find((b) => b.booking.status === 'offered')?.booking.offerExpiresAt ?? null,
    waitlistPosition:
      bookings.find((b) => b.booking.status === 'waitlisted')?.booking.waitlistPosition ?? null,
    manualMethod: pendingManual?.method ?? null,
    proofStatus: proofs.at(-1)?.status ?? null,
    refund: refund ? { status: refund.status, amountMillimes: refund.amountMillimes } : null,
    canCancel,
    refundIfCancelled: canCancel
      ? refundAmount({
          policy: event.cancellationPolicy,
          startsAt: event.startsAt,
          now,
          paidMillimes: order.paidMillimes,
          cancelledByOrganizer: false,
        })
      : 0,
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      venueName: event.venueName,
      address: event.address,
      city: event.city,
      coverUrl: event.coverUrl,
      cancellationPolicy: event.cancellationPolicy,
      status: event.status,
    },
    tickets: attendees.map((a) => {
      const line = bookings.find((b) => b.booking.id === a.bookingId);
      return {
        id: a.id,
        fullName: a.fullName,
        ticketName: line?.ticketName ?? null,
        meetingPoint: line?.meetingPoint ?? null,
        meetAt: line?.meetAt ?? null,
        // The QR code is only issued once the place is confirmed.
        ticketCode: line?.booking.status === 'confirmed' ? a.ticketCode : null,
        checkedInAt: a.checkedInAt,
      };
    }),
  };
}

/** Private file key of a proof, for organizers of the order's event (served via a checked route). */
export async function getProofForViewer(db: Executor, actor: Actor | null, proofId: string) {
  if (!actor) throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
  const [row] = await db
    .select({
      proof: schema.paymentProofs,
      eventId: schema.orders.eventId,
      buyerId: schema.orders.buyerId,
    })
    .from(schema.paymentProofs)
    .innerJoin(schema.payments, eq(schema.payments.id, schema.paymentProofs.paymentId))
    .innerJoin(schema.orders, eq(schema.orders.id, schema.payments.orderId))
    .where(and(eq(schema.paymentProofs.id, proofId)))
    .limit(1);
  if (!row?.eventId) throw new AppError('NOT_FOUND', 'errors.notFound');
  return row;
}
