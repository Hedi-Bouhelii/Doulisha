import type { Executor, Tx } from '@doulisha/db';
import { schema } from '@doulisha/db';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { isBalanced, refundEntries } from '../domain/ledger';
import { refundAmount } from '../domain/refund-policy';
import type { ServiceDeps } from '../deps';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { getOwnOrder, organizerKey } from './payments';
import { lockEventStock, movePlaces, offerFreedPlaces, orderBookings } from './stock';

const ACTIVE_BOOKINGS = ['held', 'confirmed', 'offered', 'waitlisted'] as const;

/**
 * Cancels an order's bookings, frees their places and offers them to the
 * waitlist. Returns the refund owed. Caller holds the event lock.
 */
async function cancelOrderInTransaction(
  tx: Tx,
  stock: NonNullable<Awaited<ReturnType<typeof lockEventStock>>>,
  order: typeof schema.orders.$inferSelect,
  requestedById: string,
  cancelledByOrganizer: boolean,
  now: Date,
) {
  const bookings = await orderBookings(tx, order.id);
  for (const booking of bookings) {
    if (!(ACTIVE_BOOKINGS as readonly string[]).includes(booking.status)) continue;
    if (booking.status !== 'waitlisted') await movePlaces(tx, stock, booking, -1);
    await tx
      .update(schema.bookings)
      .set({ status: 'cancelled' })
      .where(eq(schema.bookings.id, booking.id));
  }
  // Pending online attempts can no longer succeed.
  await tx
    .update(schema.payments)
    .set({ status: 'cancelled' })
    .where(and(eq(schema.payments.orderId, order.id), eq(schema.payments.status, 'pending')));

  const amount = refundAmount({
    policy: stock.event.cancellationPolicy,
    startsAt: stock.event.startsAt,
    now,
    paidMillimes: order.paidMillimes,
    cancelledByOrganizer,
  });
  await tx.update(schema.orders).set({ status: 'cancelled' }).where(eq(schema.orders.id, order.id));

  let refundId: string | null = null;
  if (amount > 0) {
    const [paid] = await tx
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.orderId, order.id), eq(schema.payments.status, 'succeeded')))
      .orderBy(desc(schema.payments.paidAt))
      .limit(1);
    const [refund] = await tx
      .insert(schema.refunds)
      .values({
        orderId: order.id,
        paymentId: paid?.id ?? null,
        amountMillimes: amount,
        reason: cancelledByOrganizer ? 'event_cancelled' : 'participant_cancelled',
        status: 'requested',
        requestedById,
      })
      .returning();
    refundId = refund!.id;
  }
  return { refundMillimes: amount, refundId };
}

/**
 * PAY-04: a participant cancels their booking. Places are released at once
 * (and offered to the waitlist); a refund following the cancellation policy
 * waits for the organizer's approval.
 */
export async function cancelOwnBooking(
  db: Executor,
  deps: ServiceDeps,
  actor: Actor | null,
  reference: string,
  now = new Date(),
) {
  const order = await getOwnOrder(db, actor, reference);
  if (!order.eventId) throw new AppError('NOT_FOUND', 'errors.notFound');
  if (!['pending', 'awaiting_payment', 'partially_paid', 'paid'].includes(order.status)) {
    throw new AppError('BAD_REQUEST', 'errors.cannotCancel');
  }
  return deps.transaction(async (tx) => {
    const stock = await lockEventStock(tx, order.eventId!);
    if (!stock) throw new AppError('NOT_FOUND', 'errors.notFound');
    if (stock.event.startsAt <= now) throw new AppError('BAD_REQUEST', 'errors.cannotCancel');
    const [locked] = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id))
      .for('update');
    const result = await cancelOrderInTransaction(tx, stock, locked!, actor!.userId, false, now);
    const offered = await offerFreedPlaces(tx, stock, now);
    return { ...result, offered: offered.length };
  });
}

async function reverseLedger(
  tx: Tx,
  args: {
    provider: string;
    organizerKey: string;
    amountMillimes: number;
    orderId: string;
    refundId: string;
  },
) {
  const lines = refundEntries(args);
  if (!isBalanced(lines)) throw new Error('Unbalanced ledger transaction');
  const transactionId = randomUUID();
  await tx.insert(schema.ledgerEntries).values(
    lines.map((line) => ({
      transactionId,
      account: line.account,
      direction: line.direction,
      amountMillimes: line.amountMillimes,
      orderId: args.orderId,
      refundId: args.refundId,
      description: 'Refund',
    })),
  );
}

/**
 * PAY-04: the organizer approves a refund. Online payments are refunded
 * through the gateway; cash, transfer and D17 are handed back by the organizer
 * and recorded here. Rejecting leaves the money with the organizer.
 */
export async function decideRefund(
  deps: ServiceDeps,
  deciderId: string,
  refundId: string,
  approve: boolean,
  now = new Date(),
) {
  const plan = await deps.transaction(async (tx) => {
    const [refund] = await tx
      .select()
      .from(schema.refunds)
      .where(eq(schema.refunds.id, refundId))
      .for('update');
    if (!refund) throw new AppError('NOT_FOUND', 'errors.notFound');
    if (refund.status !== 'requested') return null;
    if (!approve) {
      await tx
        .update(schema.refunds)
        .set({ status: 'rejected', approvedById: deciderId })
        .where(eq(schema.refunds.id, refund.id));
      return null;
    }
    const [payment] = refund.paymentId
      ? await tx.select().from(schema.payments).where(eq(schema.payments.id, refund.paymentId))
      : [];
    await tx
      .update(schema.refunds)
      .set({ status: 'approved', approvedById: deciderId })
      .where(eq(schema.refunds.id, refund.id));
    return { refund, payment: payment ?? null };
  });
  if (!plan) return;

  // Talk to the gateway outside the transaction, then record the result.
  const provider = plan.payment ? deps.payments[plan.payment.provider] : undefined;
  if (provider && plan.payment) {
    await provider.refund({
      paymentId: plan.payment.id,
      providerRef: plan.payment.providerRef,
      amountMillimes: plan.refund.amountMillimes,
    });
  }

  await deps.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, plan.refund.orderId))
      .for('update');
    const [event] = order?.eventId
      ? await tx.select().from(schema.events).where(eq(schema.events.id, order.eventId))
      : [];
    await tx
      .update(schema.refunds)
      .set({ status: 'processed', processedAt: now })
      .where(eq(schema.refunds.id, plan.refund.id));
    if (order) {
      const paidMillimes = Math.max(0, order.paidMillimes - plan.refund.amountMillimes);
      await tx
        .update(schema.orders)
        .set({ paidMillimes, status: 'refunded' })
        .where(eq(schema.orders.id, order.id));
    }
    if (plan.payment && plan.refund.amountMillimes >= plan.payment.amountMillimes) {
      await tx
        .update(schema.payments)
        .set({ status: 'refunded' })
        .where(eq(schema.payments.id, plan.payment.id));
    }
    if (order && event) {
      await reverseLedger(tx, {
        provider: plan.payment?.provider ?? 'manual',
        organizerKey: organizerKey(event),
        amountMillimes: plan.refund.amountMillimes,
        orderId: order.id,
        refundId: plan.refund.id,
      });
    }
  });
}

/**
 * The organizer cancels the whole event: every booking is cancelled and
 * everyone is owed a full refund (approved automatically). Guests are notified
 * in Phase 6 (COM-01).
 */
export async function cancelEvent(
  deps: ServiceDeps,
  organizerId: string,
  eventId: string,
  now = new Date(),
) {
  const refundIds = await deps.transaction(async (tx) => {
    const stock = await lockEventStock(tx, eventId);
    if (!stock) throw new AppError('NOT_FOUND', 'errors.notFound');
    if (stock.event.status === 'cancelled') return [];
    const orders = await tx
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.eventId, eventId),
          inArray(schema.orders.status, ['pending', 'awaiting_payment', 'partially_paid', 'paid']),
        ),
      )
      .for('update');
    const ids: string[] = [];
    for (const order of orders) {
      const { refundId } = await cancelOrderInTransaction(tx, stock, order, organizerId, true, now);
      if (refundId) ids.push(refundId);
    }
    await tx
      .update(schema.events)
      .set({ status: 'cancelled', cancelledAt: now })
      .where(eq(schema.events.id, eventId));
    return ids;
  });
  for (const id of refundIds) await decideRefund(deps, organizerId, id, true, now);
  return { refunds: refundIds.length };
}
