import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, id, timestamps } from './columns';
import {
  bookingStatus,
  discountKind,
  ledgerDirection,
  orderKind,
  orderSource,
  orderStatus,
  paymentMethod,
  paymentProvider,
  paymentStatus,
  payoutStatus,
  refundStatus,
  reviewStatus,
  subscriptionPlan,
  subscriptionStatus,
} from './enums';
import { events, meetingPoints, occurrences, ticketTypes } from './events';
import { users } from './identity';

/** SHR-04 attribution captured from the shared link. */
export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

/**
 * PAY-01 unified checkout: one order per purchase (tickets, slots, provider
 * deposits, gift-pool contributions). All amounts are in millimes (1 TND = 1000).
 */
export const orders = pgTable(
  'orders',
  {
    id: id(),
    /** Human-friendly booking reference, e.g. "DLS-7K3Q9P". */
    reference: text().notNull().unique(),
    buyerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    eventId: uuid().references(() => events.id, { onDelete: 'restrict' }),
    kind: orderKind().notNull().default('ticket'),
    source: orderSource().notNull().default('online'),
    status: orderStatus().notNull().default('pending'),
    totalMillimes: integer().notNull(),
    paidMillimes: integer().notNull().default(0),
    /** Balance due date for deposit + balance (PAY-03). */
    balanceDueAt: timestamp({ withTimezone: true }),
    currency: text().notNull().default('TND'),
    /** Client-supplied key so retried checkouts never create two orders. */
    idempotencyKey: text().unique(),
    utm: jsonb().$type<Utm>().notNull().default({}),
    ...timestamps(),
  },
  (t) => [
    index().on(t.buyerId),
    index().on(t.eventId, t.status),
    check('orders_amounts_valid', sql`${t.totalMillimes} >= 0 and ${t.paidMillimes} >= 0`),
  ],
);

/** Places reserved for an order, per ticket type. Holds expire (`holdExpiresAt`). */
export const bookings = pgTable(
  'bookings',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'restrict' }),
    occurrenceId: uuid().references(() => occurrences.id, { onDelete: 'set null' }),
    ticketTypeId: uuid().references(() => ticketTypes.id, { onDelete: 'restrict' }),
    meetingPointId: uuid().references(() => meetingPoints.id, { onDelete: 'set null' }),
    quantity: smallint().notNull().default(1),
    /** Places this booking takes (quantity × seats per ticket). */
    places: smallint().notNull().default(1),
    status: bookingStatus().notNull().default('held'),
    holdExpiresAt: timestamp({ withTimezone: true }),
    /** PRT-04 order in the waitlist. */
    waitlistPosition: integer(),
    offerExpiresAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index().on(t.orderId),
    index().on(t.eventId, t.status),
    index().on(t.occurrenceId),
    index().on(t.ticketTypeId),
    index().on(t.meetingPointId),
    index('bookings_hold_expiry')
      .on(t.holdExpiresAt)
      .where(sql`${t.status} = 'held'`),
    check('bookings_quantity_valid', sql`${t.quantity} > 0 and ${t.places} > 0`),
  ],
);

/** PRT-01 one row per person, with their e-ticket (TKT-04) and check-in (TKT-05). */
export const attendees = pgTable(
  'attendees',
  {
    id: id(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    fullName: text().notNull(),
    phone: text(),
    email: text(),
    /** TKT-03 answers keyed by booking question id. */
    answers: jsonb().$type<Record<string, string>>().notNull().default({}),
    /** Signed code encoded in the QR ticket. */
    ticketCode: text().notNull().unique(),
    notes: text(),
    checkedInAt: timestamp({ withTimezone: true }),
    checkedInById: uuid().references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    index().on(t.bookingId),
    index().on(t.eventId),
    index().on(t.userId),
    index().on(t.checkedInById),
  ],
);

/** PAY-02 payments; `providerRef` is the gateway's id (never card data). */
export const payments = pgTable(
  'payments',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    provider: paymentProvider().notNull(),
    method: paymentMethod().notNull(),
    status: paymentStatus().notNull().default('pending'),
    amountMillimes: integer().notNull(),
    providerRef: text(),
    /** Webhook / confirmation idempotency. */
    idempotencyKey: text().unique(),
    confirmedById: uuid().references(() => users.id, { onDelete: 'set null' }),
    paidAt: timestamp({ withTimezone: true }),
    raw: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps(),
  },
  (t) => [
    index().on(t.orderId),
    index().on(t.confirmedById),
    index().on(t.provider, t.providerRef),
    check('payments_amount_positive', sql`${t.amountMillimes} > 0`),
  ],
);

/** PRT-03 proofs of cash, transfer or D17 payments (private bucket). */
export const paymentProofs = pgTable(
  'payment_proofs',
  {
    id: id(),
    paymentId: uuid()
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    uploadedById: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileKey: text().notNull(),
    status: reviewStatus().notNull().default('pending'),
    reviewedById: uuid().references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp({ withTimezone: true }),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.paymentId), index().on(t.uploadedById), index().on(t.reviewedById)],
);

/** PAY-04 refunds from the cancellation policy, approved by the organizer. */
export const refunds = pgTable(
  'refunds',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    paymentId: uuid().references(() => payments.id, { onDelete: 'set null' }),
    amountMillimes: integer().notNull(),
    reason: text(),
    status: refundStatus().notNull().default('requested'),
    requestedById: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    approvedById: uuid().references(() => users.id, { onDelete: 'set null' }),
    processedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index().on(t.orderId),
    index().on(t.paymentId),
    index().on(t.requestedById),
    index().on(t.approvedById),
    check('refunds_amount_positive', sql`${t.amountMillimes} > 0`),
  ],
);

/**
 * Double-entry ledger. Every money movement writes entries that share a
 * `transactionId` and balance (sum of debits = sum of credits).
 * Accounts are strings such as `organizer:<id>`, `platform:fees`, `gateway:konnect`.
 */
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: id(),
    transactionId: uuid().notNull(),
    account: text().notNull(),
    direction: ledgerDirection().notNull(),
    amountMillimes: integer().notNull(),
    orderId: uuid().references(() => orders.id, { onDelete: 'restrict' }),
    paymentId: uuid().references(() => payments.id, { onDelete: 'restrict' }),
    refundId: uuid().references(() => refunds.id, { onDelete: 'restrict' }),
    payoutId: uuid().references(() => payouts.id, { onDelete: 'restrict' }),
    description: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.transactionId),
    index().on(t.account, t.createdAt),
    index().on(t.orderId),
    index().on(t.paymentId),
    index().on(t.refundId),
    index().on(t.payoutId),
    check('ledger_amount_positive', sql`${t.amountMillimes} > 0`),
  ],
);

/** PAY-06 payouts to organizers, providers and hosts (V1 flow; table ready). */
export const payouts = pgTable(
  'payouts',
  {
    id: id(),
    recipientId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    amountMillimes: integer().notNull(),
    status: payoutStatus().notNull().default('pending'),
    reference: text(),
    paidAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index().on(t.recipientId, t.status)],
);

/** ORG-02 organizer plans and the free trial (spec 10.1). */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plan: subscriptionPlan().notNull().default('free'),
    status: subscriptionStatus().notNull().default('trialing'),
    /** Trial: first 3 published paid events or 60 days, whichever comes first. */
    trialEndsAt: timestamp({ withTimezone: true }),
    trialPaidEventsUsed: smallint().notNull().default(0),
    currentPeriodEnd: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index().on(t.userId, t.status)],
);

/** TKT-06 promo codes (V1 feature; table ready). */
export const promoCodes = pgTable(
  'promo_codes',
  {
    id: id(),
    code: text().notNull(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: uuid().references(() => events.id, { onDelete: 'cascade' }),
    ticketTypeId: uuid().references(() => ticketTypes.id, { onDelete: 'cascade' }),
    kind: discountKind().notNull(),
    value: integer().notNull(),
    maxUses: integer(),
    usedCount: integer().notNull().default(0),
    validFrom: timestamp({ withTimezone: true }),
    validUntil: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index().on(t.ownerId),
    index().on(t.eventId, t.code),
    index().on(t.ticketTypeId),
    check('promo_value_valid', sql`${t.value} > 0`),
  ],
);

/** PAY-08 invoices (VAT 19% on subscriptions and commissions). */
export const invoices = pgTable(
  'invoices',
  {
    id: id(),
    number: text().notNull().unique(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    subscriptionId: uuid().references(() => subscriptions.id, { onDelete: 'set null' }),
    orderId: uuid().references(() => orders.id, { onDelete: 'set null' }),
    amountExclVatMillimes: integer().notNull(),
    vatMillimes: integer().notNull(),
    totalMillimes: integer().notNull(),
    fileKey: text(),
    issuedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ...timestamps(),
  },
  (t) => [index().on(t.userId), index().on(t.subscriptionId), index().on(t.orderId)],
);
