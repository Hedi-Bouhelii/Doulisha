import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { manualAttendeeSchema } from '@doulisha/validators';
import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import type { z } from 'zod';

import type { ServiceDeps } from '../deps';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { randomCode } from './booking';
import { loadManagedEvent } from './event-editor';
import { recordManualPayment } from './payments';
import { lockEventStock, movePlaces, releaseExpired } from './stock';

/** PRT-01 payment status of a person, from their order. */
export type AttendeePayment =
  'paid' | 'deposit' | 'pending' | 'refunded' | 'cancelled' | 'waitlisted';

export function attendeePayment(
  order: {
    status: string;
    paidMillimes: number;
    totalMillimes: number;
  },
  bookingStatus: string,
): AttendeePayment {
  if (bookingStatus === 'waitlisted' || bookingStatus === 'offered') return 'waitlisted';
  if (order.status === 'refunded') return 'refunded';
  if (
    order.status === 'cancelled' ||
    order.status === 'expired' ||
    bookingStatus === 'cancelled' ||
    bookingStatus === 'expired'
  ) {
    return 'cancelled';
  }
  if (order.totalMillimes === 0 || order.paidMillimes >= order.totalMillimes) return 'paid';
  if (order.paidMillimes > 0) return 'deposit';
  return 'pending';
}

/** PRT-01: the attendee list with payment status, answers, notes and check-in. */
export async function listAttendees(db: Executor, actor: Actor, eventId: string) {
  await loadManagedEvent(db, actor, eventId);
  const rows = await db
    .select({
      attendee: schema.attendees,
      booking: schema.bookings,
      order: schema.orders,
      ticketName: schema.ticketTypes.name,
      meetingPoint: schema.meetingPoints.name,
    })
    .from(schema.attendees)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.attendees.bookingId))
    .innerJoin(schema.orders, eq(schema.orders.id, schema.bookings.orderId))
    .leftJoin(schema.ticketTypes, eq(schema.ticketTypes.id, schema.bookings.ticketTypeId))
    .leftJoin(schema.meetingPoints, eq(schema.meetingPoints.id, schema.bookings.meetingPointId))
    .where(eq(schema.attendees.eventId, eventId))
    .orderBy(asc(schema.orders.createdAt), asc(schema.attendees.createdAt));

  const orderIds = [...new Set(rows.map((r) => r.order.id))];
  const proofs = orderIds.length
    ? await db
        .select({
          id: schema.paymentProofs.id,
          status: schema.paymentProofs.status,
          fileKey: schema.paymentProofs.fileKey,
          orderId: schema.payments.orderId,
          method: schema.payments.method,
          amountMillimes: schema.payments.amountMillimes,
        })
        .from(schema.paymentProofs)
        .innerJoin(schema.payments, eq(schema.payments.id, schema.paymentProofs.paymentId))
        .where(inArray(schema.payments.orderId, orderIds))
    : [];
  const refunds = orderIds.length
    ? await db
        .select()
        .from(schema.refunds)
        .where(
          and(inArray(schema.refunds.orderId, orderIds), eq(schema.refunds.status, 'requested')),
        )
    : [];

  return rows.map(({ attendee, booking, order, ticketName, meetingPoint }) => ({
    id: attendee.id,
    fullName: attendee.fullName,
    phone: attendee.phone,
    email: attendee.email,
    answers: attendee.answers,
    notes: attendee.notes,
    ticketCode: attendee.ticketCode,
    checkedInAt: attendee.checkedInAt,
    ticketName,
    meetingPoint,
    orderId: order.id,
    reference: order.reference,
    source: order.source,
    utmSource: order.utm.source ?? null,
    totalMillimes: order.totalMillimes,
    paidMillimes: order.paidMillimes,
    waitlistPosition: booking.waitlistPosition,
    bookingStatus: booking.status,
    payment: attendeePayment(order, booking.status),
    proofs: proofs.filter((p) => p.orderId === order.id),
    refundRequests: refunds
      .filter((r) => r.orderId === order.id)
      .map((r) => ({ id: r.id, amountMillimes: r.amountMillimes })),
  }));
}

/**
 * PRT-02: the organizer adds someone who booked by phone or WhatsApp. Uses the
 * same stock rules as online bookings; can be marked paid at once (cash).
 */
export async function addManualAttendee(
  db: Executor,
  deps: ServiceDeps,
  actor: Actor,
  input: z.infer<typeof manualAttendeeSchema>,
  now = new Date(),
) {
  await loadManagedEvent(db, actor, input.eventId);
  const orderId = await deps.transaction(async (tx) => {
    const stock = await lockEventStock(tx, input.eventId);
    if (!stock) throw new AppError('NOT_FOUND', 'errors.notFound');
    await releaseExpired(tx, stock, now);
    const ticket = stock.tickets.find((t) => t.id === input.ticketTypeId);
    if (!ticket) throw new AppError('BAD_REQUEST', 'errors.invalidTickets');
    const places = input.quantity * ticket.seatsPerTicket;
    const fits =
      (stock.event.capacity === null || stock.event.placesTaken + places <= stock.event.capacity) &&
      (ticket.quantity === null || ticket.sold + input.quantity <= ticket.quantity);
    if (!fits) throw new AppError('CONFLICT', 'errors.soldOut');

    const total = ticket.priceMillimes * input.quantity;
    const [order] = await tx
      .insert(schema.orders)
      .values({
        reference: `DLS-${randomCode(6)}`,
        buyerId: actor.userId,
        eventId: input.eventId,
        source: 'manual',
        status: total === 0 ? 'paid' : 'awaiting_payment',
        totalMillimes: total,
      })
      .returning();
    const [booking] = await tx
      .insert(schema.bookings)
      .values({
        orderId: order!.id,
        eventId: input.eventId,
        ticketTypeId: ticket.id,
        quantity: input.quantity,
        places,
        status: 'confirmed',
      })
      .returning();
    await movePlaces(tx, stock, booking!, 1);
    await tx.insert(schema.attendees).values(
      Array.from({ length: places }, (_, i) => ({
        bookingId: booking!.id,
        eventId: input.eventId,
        fullName: i === 0 ? input.fullName : `${input.fullName} +${i}`,
        phone: i === 0 ? (input.phone ?? null) : null,
        email: i === 0 ? (input.email ?? null) : null,
        notes: i === 0 ? (input.notes ?? null) : null,
        ticketCode: randomCode(12),
      })),
    );
    return total > 0 ? order!.id : null;
  });
  if (orderId && input.paid)
    await recordManualPayment(deps, actor.userId, orderId, input.method, now);
}

/** Private note on an attendee (PRT-01). */
export async function setAttendeeNote(
  db: Executor,
  actor: Actor,
  attendeeId: string,
  notes: string | null,
) {
  const [attendee] = await db
    .select()
    .from(schema.attendees)
    .where(eq(schema.attendees.id, attendeeId));
  if (!attendee) throw new AppError('NOT_FOUND', 'errors.notFound');
  await loadManagedEvent(db, actor, attendee.eventId);
  await db.update(schema.attendees).set({ notes }).where(eq(schema.attendees.id, attendeeId));
}

export type CheckInResult =
  | { status: 'checked_in'; fullName: string; ticketName: string | null; payment: AttendeePayment }
  | { status: 'already'; fullName: string; checkedInAt: Date }
  | { status: 'invalid' };

/**
 * TKT-05 check-in by ticket code (QR). Only confirmed bookings of this event
 * are accepted; unpaid tickets are admitted but flagged so the organizer can
 * collect the payment at the door.
 */
export async function checkIn(
  db: Executor,
  actor: Actor,
  eventId: string,
  code: string,
  now = new Date(),
): Promise<CheckInResult> {
  await loadManagedEvent(db, actor, eventId);
  const [row] = await db
    .select({
      attendee: schema.attendees,
      booking: schema.bookings,
      order: schema.orders,
      ticketName: schema.ticketTypes.name,
    })
    .from(schema.attendees)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.attendees.bookingId))
    .innerJoin(schema.orders, eq(schema.orders.id, schema.bookings.orderId))
    .leftJoin(schema.ticketTypes, eq(schema.ticketTypes.id, schema.bookings.ticketTypeId))
    .where(
      and(
        eq(schema.attendees.eventId, eventId),
        eq(schema.attendees.ticketCode, code.trim().toUpperCase()),
      ),
    )
    .limit(1);
  if (!row || row.booking.status !== 'confirmed') return { status: 'invalid' };
  if (row.attendee.checkedInAt) {
    return {
      status: 'already',
      fullName: row.attendee.fullName,
      checkedInAt: row.attendee.checkedInAt,
    };
  }
  await db
    .update(schema.attendees)
    .set({ checkedInAt: now, checkedInById: actor.userId })
    .where(eq(schema.attendees.id, row.attendee.id));
  return {
    status: 'checked_in',
    fullName: row.attendee.fullName,
    ticketName: row.ticketName,
    payment: attendeePayment(row.order, row.booking.status),
  };
}

/**
 * ORG-01 dashboard: upcoming events with fill rate, revenue, pending payments,
 * and where bookings came from (SHR-04 UTM).
 */
export async function organizerDashboard(db: Executor, actor: Actor, now = new Date()) {
  const profiles = await db
    .select({ id: schema.organizerProfiles.id })
    .from(schema.organizerProfiles)
    .where(eq(schema.organizerProfiles.ownerUserId, actor.userId));
  const profileIds = profiles.map((p) => p.id);
  const mine = or(
    eq(schema.events.creatorId, actor.userId),
    profileIds.length ? inArray(schema.events.organizerProfileId, profileIds) : undefined,
  );

  const events = await db
    .select({
      id: schema.events.id,
      slug: schema.events.slug,
      title: schema.events.title,
      status: schema.events.status,
      visibility: schema.events.visibility,
      startsAt: schema.events.startsAt,
      capacity: schema.events.capacity,
      placesTaken: schema.events.placesTaken,
      coverUrl: schema.events.coverUrl,
      revenueMillimes:
        sql<number>`coalesce((select sum(${schema.orders.paidMillimes}) from ${schema.orders} where ${schema.orders.eventId} = ${schema.events.id}), 0)`.mapWith(
          Number,
        ),
      pendingMillimes:
        sql<number>`coalesce((select sum(${schema.orders.totalMillimes} - ${schema.orders.paidMillimes}) from ${schema.orders} where ${schema.orders.eventId} = ${schema.events.id} and ${schema.orders.status} in ('awaiting_payment', 'partially_paid')), 0)`.mapWith(
          Number,
        ),
      pendingOrders:
        sql<number>`(select count(*) from ${schema.orders} where ${schema.orders.eventId} = ${schema.events.id} and ${schema.orders.status} in ('awaiting_payment', 'partially_paid'))`.mapWith(
          Number,
        ),
    })
    .from(schema.events)
    .where(
      and(
        isNull(schema.events.deletedAt),
        mine,
        gte(schema.events.startsAt, new Date(now.getTime() - 30 * 86_400_000)),
      ),
    )
    .orderBy(asc(schema.events.startsAt));

  const eventIds = events.map((e) => e.id);
  const sources = eventIds.length
    ? await db
        .select({
          source: sql<string>`coalesce(${schema.orders.utm}->>'source', 'direct')`,
          orders: sql<number>`count(*)`.mapWith(Number),
          revenueMillimes: sql<number>`coalesce(sum(${schema.orders.paidMillimes}), 0)`.mapWith(
            Number,
          ),
        })
        .from(schema.orders)
        .where(
          and(
            inArray(schema.orders.eventId, eventIds),
            inArray(schema.orders.status, ['paid', 'partially_paid', 'awaiting_payment']),
          ),
        )
        .groupBy(sql`1`)
        .orderBy(desc(sql`2`))
    : [];

  const upcoming = events.filter((e) => e.startsAt >= now && e.status !== 'cancelled');
  return {
    events,
    sources,
    totals: {
      upcomingEvents: upcoming.length,
      revenueMillimes: events.reduce((s, e) => s + e.revenueMillimes, 0),
      pendingMillimes: events.reduce((s, e) => s + e.pendingMillimes, 0),
      pendingOrders: events.reduce((s, e) => s + e.pendingOrders, 0),
      fillRate: (() => {
        const withCapacity = upcoming.filter((e) => e.capacity);
        const capacity = withCapacity.reduce((s, e) => s + (e.capacity ?? 0), 0);
        const taken = withCapacity.reduce((s, e) => s + e.placesTaken, 0);
        return capacity ? taken / capacity : null;
      })(),
    },
  };
}

/** Bookings by source for one event (SHR-04). */
export async function eventSources(db: Executor, actor: Actor, eventId: string) {
  await loadManagedEvent(db, actor, eventId);
  return db
    .select({
      source: sql<string>`coalesce(${schema.orders.utm}->>'source', 'direct')`,
      orders: sql<number>`count(*)`.mapWith(Number),
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.eventId, eventId),
        inArray(schema.orders.status, ['paid', 'partially_paid', 'awaiting_payment']),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(desc(sql`2`));
}
