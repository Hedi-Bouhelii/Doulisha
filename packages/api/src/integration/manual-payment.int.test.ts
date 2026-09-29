/**
 * Integration test on a real Neon branch: the D17 / bank transfer workflow
 * (ADR 0018). A reservation has no QR code until the organizer confirms the
 * payment, a receipt pauses the deadline and must be reviewed before anyone
 * marks the order paid, and a cancelled reservation frees its places.
 *
 * Run with `pnpm --filter @doulisha/api test:integration` (needs DATABASE_URL,
 * refuses the production branch). It creates its own event and cleans up.
 */
import { createHttpDb, schema, withTransaction } from '@doulisha/db';
import { loadRootEnv, requireEnv } from '@doulisha/db/load-env';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BuyerNotice, ServiceDeps } from '../deps';
import { AppError } from '../errors';
import type { Actor } from '../permissions';
import { createBooking } from '../services/booking';
import {
  attachProof,
  cancelReservation,
  recordManualPayment,
  reviewProof,
} from '../services/payments';
import { getMyOrder } from '../services/tickets';

loadRootEnv();
if (process.env.NEON_BRANCH === 'production') {
  throw new Error('Integration tests must not run against the production branch');
}
const url = requireEnv('DATABASE_URL');
const db = createHttpDb(url);

const notices: BuyerNotice[] = [];
const deps: ServiceDeps = {
  transaction: (fn) => withTransaction(url, fn),
  payments: {},
  storage: {
    id: 'local',
    createUpload: () => Promise.reject(new Error('unused')),
    publicUrl: (k) => k,
  },
  appUrl: 'http://localhost:3000',
  notify: (notice) => {
    notices.push(notice);
    return Promise.resolve();
  },
};

const HOUR = 3_600_000;
const run = `it-pay-${Date.now()}`;
const userIds: string[] = [];
let organizerId = '';
let buyer: Actor;
let eventId = '';
let ticketId = '';

function book(i: number) {
  return createBooking(
    db,
    deps,
    buyer,
    {
      eventId,
      lines: [{ ticketTypeId: ticketId, quantity: 1 }],
      attendees: [{ fullName: `Buyer ${i}`, phone: '+21655123456' }],
      answers: {},
      payment: 'd17',
      payDeposit: false,
      idempotencyKey: `${run}-${i}`,
      utm: {},
    },
    'fr',
  );
}

async function orderId(reference: string) {
  const [order] = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(eq(schema.orders.reference, reference));
  return order!.id;
}

async function pendingProofId(reference: string) {
  const [row] = await db
    .select({ id: schema.paymentProofs.id })
    .from(schema.paymentProofs)
    .innerJoin(schema.payments, eq(schema.payments.id, schema.paymentProofs.paymentId))
    .innerJoin(schema.orders, eq(schema.orders.id, schema.payments.orderId))
    .where(and(eq(schema.orders.reference, reference), eq(schema.paymentProofs.status, 'pending')));
  return row!.id;
}

async function placesTaken() {
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
  return event!.placesTaken;
}

beforeAll(async () => {
  const users = await db
    .insert(schema.users)
    .values([
      { name: 'Integration organizer', email: `${run}-org@test.doulisha.invalid` },
      { name: 'Integration buyer', email: `${run}-buyer@test.doulisha.invalid` },
    ])
    .returning();
  userIds.push(...users.map((u) => u.id));
  organizerId = users[0]!.id;
  buyer = { userId: users[1]!.id, roles: ['participant'], isAnonymous: false };

  const [template] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.key, 'workshop_class'));
  if (!template) throw new Error('Run the seed first (templates are missing)');
  const [event] = await db
    .insert(schema.events)
    .values({
      slug: run,
      creatorId: organizerId,
      templateId: template.id,
      categoryId: template.categoryId,
      model: 'ticketed',
      status: 'published',
      title: 'Manual payment test',
      startsAt: new Date(Date.now() + 7 * 24 * HOUR),
      capacity: 10,
      registrationType: 'paid',
    })
    .returning();
  eventId = event!.id;
  const [ticket] = await db
    .insert(schema.ticketTypes)
    .values({ eventId, name: 'Standard', priceMillimes: 30_000, quantity: 10 })
    .returning();
  ticketId = ticket!.id;
});

afterAll(async () => {
  if (eventId) {
    const orders = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.eventId, eventId));
    // Money records restrict deletes; this test's own rows go first.
    const ids = orders.map((o) => o.id);
    if (ids.length) {
      const payments = await db
        .select({ id: schema.payments.id })
        .from(schema.payments)
        .where(inArray(schema.payments.orderId, ids));
      await db.delete(schema.ledgerEntries).where(inArray(schema.ledgerEntries.orderId, ids));
      if (payments.length) {
        await db.delete(schema.paymentProofs).where(
          inArray(
            schema.paymentProofs.paymentId,
            payments.map((p) => p.id),
          ),
        );
      }
      await db.delete(schema.payments).where(inArray(schema.payments.orderId, ids));
    }
    await db.delete(schema.orders).where(eq(schema.orders.eventId, eventId));
    await db.delete(schema.events).where(eq(schema.events.id, eventId));
  }
  if (userIds.length) await db.delete(schema.users).where(inArray(schema.users.id, userIds));
});

describe('D17 and bank transfer reservations', () => {
  it('reserves without a QR code, reviews the receipt, then issues the ticket', async () => {
    const booked = await book(1);
    expect(booked.status).toBe('awaiting_payment');
    const { reference } = booked;
    const id = await orderId(reference);

    let order = await getMyOrder(db, buyer, reference);
    expect(order.tickets.every((t) => t.ticketCode === null)).toBe(true);
    // 48 hours to pay, a week before the event.
    expect(order.paymentDeadline!.getTime() - Date.now()).toBeGreaterThan(47 * HOUR);
    expect(await placesTaken()).toBe(1);

    // The receipt pauses the clock and blocks "mark as paid".
    await attachProof(db, buyer, reference, `payment-proof/${buyer.userId}/one.jpg`);
    order = await getMyOrder(db, buyer, reference);
    expect(order.paymentDeadline).toBeNull();
    expect(order.proofStatus).toBe('pending');
    await expect(recordManualPayment(deps, organizerId, id, 'd17')).rejects.toMatchObject({
      messageKey: 'errors.proofPending',
    });

    // Rejected with a reason: the buyer sees it and has 24 hours to resend.
    await reviewProof(deps, db, organizerId, await pendingProofId(reference), {
      approve: false,
      reason: 'wrong_amount',
      note: 'Only 20 DT arrived',
    });
    order = await getMyOrder(db, buyer, reference);
    expect(order.proofRejection).toEqual({ reason: 'wrong_amount', note: 'Only 20 DT arrived' });
    const left = order.paymentDeadline!.getTime() - Date.now();
    expect(left).toBeGreaterThan(23 * HOUR);
    expect(left).toBeLessThanOrEqual(24 * HOUR);
    expect(notices.at(-1)).toMatchObject({ kind: 'receipt_rejected', reason: 'wrong_amount' });

    // A new receipt, approved with the D17 transaction number: the QR code appears.
    await attachProof(db, buyer, reference, `payment-proof/${buyer.userId}/two.jpg`);
    await reviewProof(deps, db, organizerId, await pendingProofId(reference), {
      approve: true,
      transactionRef: 'D17-889900',
    });
    order = await getMyOrder(db, buyer, reference);
    expect(order.orderStatus).toBe('paid');
    expect(order.tickets.every((t) => t.ticketCode)).toBe(true);
    expect(order.paymentDeadline).toBeNull();
    expect(notices.at(-1)).toMatchObject({
      kind: 'payment_confirmed',
      reference,
      amountMillimes: 30_000,
    });
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.orderId, id));
    expect(payment?.providerRef).toBe('D17-889900');
  });

  it('shows a lapsed reservation as expired and refuses a late receipt', async () => {
    const { reference } = await book(2);
    const later = new Date(Date.now() + 49 * HOUR);
    const order = await getMyOrder(db, buyer, reference, later);
    expect(order.orderStatus).toBe('expired');
    expect(order.canCancel).toBe(false);
    await expect(
      attachProof(db, buyer, reference, `payment-proof/${buyer.userId}/late.jpg`, later),
    ).rejects.toBeInstanceOf(AppError);
    await cancelReservation(deps, db, await orderId(reference));
  });

  it('cancels an unpaid reservation and frees its place', async () => {
    const before = await placesTaken();
    const { reference } = await book(3);
    expect(await placesTaken()).toBe(before + 1);
    await cancelReservation(deps, db, await orderId(reference));
    expect(await placesTaken()).toBe(before);
    const order = await getMyOrder(db, buyer, reference);
    expect(order.orderStatus).toBe('cancelled');
    expect(notices.at(-1)).toMatchObject({ kind: 'reservation_cancelled', reference });
    // Nothing left to confirm.
    await expect(
      recordManualPayment(deps, organizerId, await orderId(reference), 'd17'),
    ).rejects.toMatchObject({ messageKey: 'errors.nothingToPay' });
  });
});
