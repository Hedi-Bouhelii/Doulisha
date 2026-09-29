import type { Executor } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { and, asc, desc, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm';

import type { ServiceDeps } from '../deps';
import type { Actor } from '../permissions';
import { loadManagedEvent } from './event-editor';
import { lockEventStock, releaseExpired } from './stock';

type ManualMethod = 'd17' | 'bank_transfer' | 'cash';

/** Events the actor manages: created by them or published by one of their organizer profiles. */
async function managedEventIds(db: Executor, actor: Actor, eventId?: string) {
  if (eventId) {
    await loadManagedEvent(db, actor, eventId);
    return [eventId];
  }
  const profiles = await db
    .select({ id: schema.organizerProfiles.id })
    .from(schema.organizerProfiles)
    .where(eq(schema.organizerProfiles.ownerUserId, actor.userId));
  const profileIds = profiles.map((p) => p.id);
  const rows = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        isNull(schema.events.deletedAt),
        or(
          eq(schema.events.creatorId, actor.userId),
          profileIds.length ? inArray(schema.events.organizerProfileId, profileIds) : undefined,
        ),
      ),
    );
  return rows.map((r) => r.id);
}

/**
 * Releases reservations whose payment deadline passed on these events, so the
 * lists never show a lapsed reservation as payable (ADR 0018).
 */
async function releaseLapsed(deps: ServiceDeps, db: Executor, eventIds: string[], now: Date) {
  if (eventIds.length === 0) return;
  const lapsed = await db
    .selectDistinct({ eventId: schema.bookings.eventId })
    .from(schema.bookings)
    .where(
      and(
        inArray(schema.bookings.eventId, eventIds),
        eq(schema.bookings.status, 'held'),
        lt(schema.bookings.holdExpiresAt, now),
      ),
    );
  for (const { eventId } of lapsed) {
    await deps.transaction(async (tx) => {
      const stock = await lockEventStock(tx, eventId);
      if (stock) await releaseExpired(tx, stock, now);
    });
  }
}

/** Number of receipts waiting for review on the actor's events (dashboard badge). */
export async function receiptsToVerify(db: Executor, actor: Actor) {
  const eventIds = await managedEventIds(db, actor);
  if (eventIds.length === 0) return 0;
  const rows = await db
    .select({ id: schema.paymentProofs.id })
    .from(schema.paymentProofs)
    .innerJoin(schema.payments, eq(schema.payments.id, schema.paymentProofs.paymentId))
    .innerJoin(schema.orders, eq(schema.orders.id, schema.payments.orderId))
    .where(
      and(
        inArray(schema.orders.eventId, eventIds),
        eq(schema.paymentProofs.status, 'pending'),
        eq(schema.payments.status, 'pending'),
      ),
    );
  return rows.length;
}

/**
 * The organizer's payment inbox (PRT-03, ADR 0018), for all their events or
 * one: receipts to verify, reservations waiting for a D17 or transfer
 * payment, and manual payments confirmed in the last 30 days.
 */
export async function paymentsInbox(
  db: Executor,
  deps: ServiceDeps,
  actor: Actor,
  eventId?: string,
  now = new Date(),
) {
  const eventIds = await managedEventIds(db, actor, eventId);
  if (eventIds.length === 0) return { toVerify: [], awaiting: [], confirmed: [] };
  await releaseLapsed(deps, db, eventIds, now);

  const open = await db
    .select({
      orderId: schema.orders.id,
      reference: schema.orders.reference,
      totalMillimes: schema.orders.totalMillimes,
      paidMillimes: schema.orders.paidMillimes,
      bookedAt: schema.orders.createdAt,
      eventId: schema.events.id,
      eventTitle: schema.events.title,
      startsAt: schema.events.startsAt,
      paymentId: schema.payments.id,
      method: schema.payments.method,
      amountMillimes: schema.payments.amountMillimes,
    })
    .from(schema.orders)
    .innerJoin(schema.events, eq(schema.events.id, schema.orders.eventId))
    .innerJoin(
      schema.payments,
      and(
        eq(schema.payments.orderId, schema.orders.id),
        eq(schema.payments.provider, 'manual'),
        eq(schema.payments.status, 'pending'),
      ),
    )
    .where(
      and(
        inArray(schema.orders.eventId, eventIds),
        inArray(schema.orders.status, ['awaiting_payment', 'partially_paid']),
      ),
    )
    .orderBy(asc(schema.orders.createdAt));

  const orderIds = open.map((o) => o.orderId);
  const [people, bookings, proofs] = orderIds.length
    ? await Promise.all([
        db
          .select({
            orderId: schema.bookings.orderId,
            fullName: schema.attendees.fullName,
            phone: schema.attendees.phone,
            email: schema.attendees.email,
            isBuyer: schema.attendees.userId,
          })
          .from(schema.attendees)
          .innerJoin(schema.bookings, eq(schema.bookings.id, schema.attendees.bookingId))
          .where(inArray(schema.bookings.orderId, orderIds))
          .orderBy(asc(schema.attendees.createdAt)),
        db
          .select({
            orderId: schema.bookings.orderId,
            status: schema.bookings.status,
            places: schema.bookings.places,
            holdExpiresAt: schema.bookings.holdExpiresAt,
          })
          .from(schema.bookings)
          .where(inArray(schema.bookings.orderId, orderIds)),
        db
          .select({
            id: schema.paymentProofs.id,
            paymentId: schema.paymentProofs.paymentId,
            status: schema.paymentProofs.status,
            fileKey: schema.paymentProofs.fileKey,
            createdAt: schema.paymentProofs.createdAt,
          })
          .from(schema.paymentProofs)
          .where(
            inArray(
              schema.paymentProofs.paymentId,
              open.map((o) => o.paymentId),
            ),
          )
          .orderBy(asc(schema.paymentProofs.createdAt)),
      ])
    : [[], [], []];

  const items = open
    .map((o) => {
      const own = bookings.filter((b) => b.orderId === o.orderId);
      if (own.some((b) => b.status === 'expired' || b.status === 'cancelled')) return null;
      const buyer =
        people.find((p) => p.orderId === o.orderId && p.isBuyer) ??
        people.find((p) => p.orderId === o.orderId);
      const deadlines = own
        .filter((b) => b.status === 'held' && b.holdExpiresAt)
        .map((b) => b.holdExpiresAt!);
      const proof = proofs.filter((p) => p.paymentId === o.paymentId).at(-1) ?? null;
      return {
        orderId: o.orderId,
        reference: o.reference,
        event: { id: o.eventId, title: o.eventTitle, startsAt: o.startsAt },
        buyer: {
          name: buyer?.fullName ?? '',
          phone: buyer?.phone ?? null,
          email: buyer?.email ?? null,
        },
        places: own.reduce((sum, b) => sum + b.places, 0),
        method: o.method as ManualMethod,
        expectedMillimes: o.amountMillimes,
        bookedAt: o.bookedAt,
        deadline: deadlines.reduce<Date | null>((min, d) => (!min || d < min ? d : min), null),
        proof: proof
          ? {
              id: proof.id,
              status: proof.status,
              isPdf: proof.fileKey.endsWith('.pdf'),
              sentAt: proof.createdAt,
            }
          : null,
      };
    })
    .filter((item) => item !== null);

  const confirmed = await db
    .select({
      orderId: schema.orders.id,
      reference: schema.orders.reference,
      eventTitle: schema.events.title,
      method: schema.payments.method,
      amountMillimes: schema.payments.amountMillimes,
      paidAt: schema.payments.paidAt,
      transactionRef: schema.payments.providerRef,
    })
    .from(schema.payments)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.payments.orderId))
    .innerJoin(schema.events, eq(schema.events.id, schema.orders.eventId))
    .where(
      and(
        inArray(schema.orders.eventId, eventIds),
        eq(schema.payments.provider, 'manual'),
        eq(schema.payments.status, 'succeeded'),
        gte(schema.payments.paidAt, new Date(now.getTime() - 30 * 86_400_000)),
      ),
    )
    .orderBy(desc(schema.payments.paidAt))
    .limit(50);

  return {
    toVerify: items.filter((i) => i.proof?.status === 'pending'),
    // Cash is collected at the door (check-in), so only D17 and transfers wait here.
    awaiting: items.filter((i) => i.proof?.status !== 'pending' && i.method !== 'cash'),
    confirmed,
  };
}
