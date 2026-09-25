import type { Executor, Tx } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
import type { PaymentEvent } from '@doulisha/payments';
import { keyBelongsTo } from '@doulisha/storage';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';

import { isBalanced, paymentEntries } from '../domain/ledger';
import type { ServiceDeps } from '../deps';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { allowedPayments } from './booking';
import { lockEventStock, movePlaces, orderBookings } from './stock';

/** Ledger key of the organizer (profile) or host who receives the money. */
export function organizerKey(event: { organizerProfileId: string | null; creatorId: string }) {
  return event.organizerProfileId ?? `user-${event.creatorId}`;
}

/** Asks the gateway for a payment page and stores its reference. Returns the redirect URL. */
export async function startPayment(
  db: Executor,
  deps: ServiceDeps,
  args: { paymentId: string; reference: string; amountMillimes: number; locale: Locale },
): Promise<string> {
  const provider = deps.payments.mock;
  if (!provider) throw new AppError('BAD_REQUEST', 'errors.paymentMethod');
  const result = await provider.createPayment({
    paymentId: args.paymentId,
    orderReference: args.reference,
    amountMillimes: args.amountMillimes,
    method: 'card',
    returnUrl: `${deps.appUrl}/${args.locale}/tickets/${args.reference}`,
    locale: args.locale,
  });
  if (result.kind !== 'redirect') throw new Error('Online provider did not return a redirect');
  await db
    .update(schema.payments)
    .set({ providerRef: result.providerRef })
    .where(eq(schema.payments.id, args.paymentId));
  return result.url;
}

async function writeLedger(
  tx: Tx,
  args: {
    provider: string;
    organizerKey: string;
    amountMillimes: number;
    orderId: string;
    paymentId: string;
    description: string;
  },
) {
  const lines = paymentEntries(args);
  if (!isBalanced(lines)) throw new Error('Unbalanced ledger transaction');
  const transactionId = randomUUID();
  await tx.insert(schema.ledgerEntries).values(
    lines.map((line) => ({
      transactionId,
      account: line.account,
      direction: line.direction,
      amountMillimes: line.amountMillimes,
      orderId: args.orderId,
      paymentId: args.paymentId,
      description: args.description,
    })),
  );
}

/**
 * Marks a payment as received and applies it to its order: confirms held or
 * offered bookings, updates the paid amount and status, writes the ledger.
 * Requires the payment row to be locked by the caller.
 */
async function applySucceededPayment(
  tx: Tx,
  payment: typeof schema.payments.$inferSelect,
  now: Date,
  extra: { providerRef?: string; idempotencyKey?: string; confirmedById?: string } = {},
) {
  // Lock order: event first, then order, the same order as the booking path
  // (which locks the event and then updates orders), so the two cannot deadlock.
  const [unlocked] = await tx
    .select({ eventId: schema.orders.eventId })
    .from(schema.orders)
    .where(eq(schema.orders.id, payment.orderId));
  if (!unlocked?.eventId) throw new AppError('NOT_FOUND', 'errors.notFound');
  const stock = await lockEventStock(tx, unlocked.eventId);
  if (!stock) throw new AppError('NOT_FOUND', 'errors.notFound');
  const [order] = await tx
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, payment.orderId))
    .for('update');
  if (!order) throw new AppError('NOT_FOUND', 'errors.notFound');

  // A hold that expired before the payment arrived is re-taken if places are left.
  const bookings = await orderBookings(tx, order.id);
  for (const booking of bookings) {
    if (booking.status === 'expired') {
      const fits =
        stock.event.capacity === null ||
        stock.event.placesTaken + booking.places <= stock.event.capacity;
      if (!fits) throw new AppError('CONFLICT', 'errors.soldOut');
      await movePlaces(tx, stock, booking, 1);
    }
  }
  await tx
    .update(schema.bookings)
    .set({ status: 'confirmed', holdExpiresAt: null, offerExpiresAt: null })
    .where(
      and(
        eq(schema.bookings.orderId, order.id),
        inArray(schema.bookings.status, ['held', 'offered', 'expired']),
      ),
    );

  await tx
    .update(schema.payments)
    .set({
      status: 'succeeded',
      paidAt: now,
      ...(extra.providerRef ? { providerRef: extra.providerRef } : {}),
      ...(extra.idempotencyKey ? { idempotencyKey: extra.idempotencyKey } : {}),
      ...(extra.confirmedById ? { confirmedById: extra.confirmedById } : {}),
    })
    .where(eq(schema.payments.id, payment.id));

  const paidMillimes = order.paidMillimes + payment.amountMillimes;
  await tx
    .update(schema.orders)
    .set({ paidMillimes, status: paidMillimes >= order.totalMillimes ? 'paid' : 'partially_paid' })
    .where(eq(schema.orders.id, order.id));

  await writeLedger(tx, {
    provider: payment.provider,
    organizerKey: organizerKey(stock.event),
    amountMillimes: payment.amountMillimes,
    orderId: order.id,
    paymentId: payment.id,
    description: `Payment ${order.reference}`,
  });
  return order;
}

/**
 * Applies a verified gateway webhook. Idempotent: a payment that is no longer
 * pending is left as it is, so replayed or duplicated webhooks change nothing.
 */
export async function handlePaymentEvent(deps: ServiceDeps, event: PaymentEvent, now = new Date()) {
  return deps.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, event.paymentId))
      .for('update');
    if (!payment) throw new AppError('NOT_FOUND', 'errors.notFound');
    if (payment.status !== 'pending') return { applied: false as const };
    if (payment.providerRef && payment.providerRef !== event.providerRef) {
      throw new AppError('BAD_REQUEST', 'errors.generic');
    }
    if (event.status === 'failed' || event.amountMillimes !== payment.amountMillimes) {
      await tx
        .update(schema.payments)
        .set({ status: 'failed', idempotencyKey: event.eventId, raw: { ...event } })
        .where(eq(schema.payments.id, payment.id));
      return { applied: true as const, status: 'failed' as const };
    }
    await applySucceededPayment(tx, payment, now, {
      providerRef: event.providerRef,
      idempotencyKey: event.eventId,
    });
    return { applied: true as const, status: 'succeeded' as const };
  });
}

/** Loads an order the actor bought, by its reference. */
export async function getOwnOrder(db: Executor, actor: Actor | null, reference: string) {
  if (!actor) throw new AppError('UNAUTHORIZED', 'errors.signInRequired');
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.reference, reference))
    .limit(1);
  if (!order || order.buyerId !== actor.userId) throw new AppError('NOT_FOUND', 'errors.notFound');
  return order;
}

/**
 * Pays (again) online for an order: after a failed attempt, for a waitlist
 * offer, or for the balance of a deposit (PAY-03).
 */
export async function payOnline(
  db: Executor,
  deps: ServiceDeps,
  actor: Actor | null,
  reference: string,
  locale: Locale,
  now = new Date(),
): Promise<string> {
  const order = await getOwnOrder(db, actor, reference);
  const created = await deps.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id))
      .for('update');
    if (!locked || !['awaiting_payment', 'partially_paid', 'pending'].includes(locked.status)) {
      throw new AppError('BAD_REQUEST', 'errors.nothingToPay');
    }
    const bookings = await orderBookings(tx, order.id);
    const payable = bookings.every(
      (b) =>
        b.status === 'confirmed' ||
        (b.status === 'held' && b.holdExpiresAt !== null && b.holdExpiresAt > now) ||
        (b.status === 'offered' && b.offerExpiresAt !== null && b.offerExpiresAt > now),
    );
    if (!payable) throw new AppError('BAD_REQUEST', 'errors.holdExpired');
    const amount = locked.totalMillimes - locked.paidMillimes;
    if (amount <= 0) throw new AppError('BAD_REQUEST', 'errors.nothingToPay');
    // Cancel earlier pending attempts so only one can succeed.
    await tx
      .update(schema.payments)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(schema.payments.orderId, order.id),
          eq(schema.payments.status, 'pending'),
          eq(schema.payments.provider, 'mock'),
        ),
      );
    const [payment] = await tx
      .insert(schema.payments)
      .values({ orderId: order.id, provider: 'mock', method: 'card', amountMillimes: amount })
      .returning();
    if (locked.status === 'pending') {
      await tx
        .update(schema.orders)
        .set({ status: 'awaiting_payment' })
        .where(eq(schema.orders.id, order.id));
    }
    return payment!;
  });
  return startPayment(db, deps, {
    paymentId: created.id,
    reference,
    amountMillimes: created.amountMillimes,
    locale,
  });
}

/**
 * PRT-03: the organizer marks cash, transfer or D17 as received. Applies to the
 * order's pending manual payment, or records a new one for the amount due.
 */
export async function recordManualPayment(
  deps: ServiceDeps,
  confirmedById: string,
  orderId: string,
  method: 'cash' | 'bank_transfer' | 'd17',
  now = new Date(),
) {
  return deps.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (!order) throw new AppError('NOT_FOUND', 'errors.notFound');
    const due = order.totalMillimes - order.paidMillimes;
    if (due <= 0 || !['awaiting_payment', 'partially_paid'].includes(order.status)) {
      throw new AppError('BAD_REQUEST', 'errors.nothingToPay');
    }
    let [payment] = await tx
      .select()
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.orderId, order.id),
          eq(schema.payments.provider, 'manual'),
          eq(schema.payments.status, 'pending'),
        ),
      )
      .for('update');
    if (!payment) {
      [payment] = await tx
        .insert(schema.payments)
        .values({ orderId: order.id, provider: 'manual', method, amountMillimes: due })
        .returning();
    }
    await applySucceededPayment(tx, payment!, now, { confirmedById });
  });
}

/** The buyer attaches a proof of transfer or D17 payment to their order (PAY-02). */
export async function attachProof(
  db: Executor,
  actor: Actor | null,
  reference: string,
  fileKey: string,
) {
  const order = await getOwnOrder(db, actor, reference);
  if (!keyBelongsTo(fileKey, 'payment-proof', actor!.userId)) {
    throw new AppError('BAD_REQUEST', 'errors.generic');
  }
  let [payment] = await db
    .select()
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.orderId, order.id),
        eq(schema.payments.provider, 'manual'),
        eq(schema.payments.status, 'pending'),
      ),
    )
    .limit(1);
  if (!payment) {
    const due = order.totalMillimes - order.paidMillimes;
    if (due <= 0) throw new AppError('BAD_REQUEST', 'errors.nothingToPay');
    [payment] = await db
      .insert(schema.payments)
      .values({
        orderId: order.id,
        provider: 'manual',
        method: 'bank_transfer',
        amountMillimes: due,
      })
      .returning();
  }
  await db.insert(schema.paymentProofs).values({
    paymentId: payment!.id,
    uploadedById: actor!.userId,
    fileKey,
  });
}

/** PRT-03: the organizer approves or rejects an uploaded proof. */
export async function reviewProof(
  deps: ServiceDeps,
  reviewerId: string,
  proofId: string,
  approve: boolean,
  now = new Date(),
) {
  return deps.transaction(async (tx) => {
    const [proof] = await tx
      .select()
      .from(schema.paymentProofs)
      .where(eq(schema.paymentProofs.id, proofId))
      .for('update');
    if (!proof) throw new AppError('NOT_FOUND', 'errors.notFound');
    if (proof.status !== 'pending') return;
    await tx
      .update(schema.paymentProofs)
      .set({ status: approve ? 'approved' : 'rejected', reviewedById: reviewerId, reviewedAt: now })
      .where(eq(schema.paymentProofs.id, proof.id));
    if (!approve) return;
    const [payment] = await tx
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, proof.paymentId))
      .for('update');
    if (payment?.status === 'pending') {
      await applySucceededPayment(tx, payment, now, { confirmedById: reviewerId });
    }
  });
}

/**
 * The buyer switches between D17, transfer and cash before paying ("Pay
 * differently"). Only while a manual payment is pending and no receipt is
 * under review; online payment has its own path (`payOnline`).
 */
export async function changeManualMethod(
  db: Executor,
  actor: Actor | null,
  reference: string,
  method: 'cash' | 'bank_transfer' | 'd17',
) {
  const order = await getOwnOrder(db, actor, reference);
  const [event] = await db
    .select({ registrationType: schema.events.registrationType })
    .from(schema.events)
    .where(eq(schema.events.id, order.eventId!));
  if (!event || !allowedPayments(event.registrationType).includes(method)) {
    throw new AppError('BAD_REQUEST', 'errors.paymentMethodNotAllowed');
  }
  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.orderId, order.id),
        eq(schema.payments.provider, 'manual'),
        eq(schema.payments.status, 'pending'),
      ),
    )
    .limit(1);
  if (!payment) throw new AppError('BAD_REQUEST', 'errors.nothingToPay');
  const [pendingProof] = await db
    .select({ id: schema.paymentProofs.id })
    .from(schema.paymentProofs)
    .where(
      and(
        eq(schema.paymentProofs.paymentId, payment.id),
        eq(schema.paymentProofs.status, 'pending'),
      ),
    )
    .limit(1);
  if (pendingProof) throw new AppError('BAD_REQUEST', 'errors.proofUnderReview');
  await db.update(schema.payments).set({ method }).where(eq(schema.payments.id, payment.id));
}
