import { manualAttendeeSchema, organizerProfileInputSchema } from '@doulisha/validators';
import { z } from 'zod';

import { AppError } from '../errors';
import { loadManagedEvent } from '../services/event-editor';
import {
  addManualAttendee,
  checkIn,
  eventSources,
  listAttendees,
  organizerDashboard,
  setAttendeeNote,
} from '../services/organizer-tools';
import {
  addPhoto,
  createProfile,
  getOwnProfileDetail,
  listOwnProfiles,
  removePhoto,
  updateProfile,
} from '../services/organizers';
import { paymentsInbox, receiptsToVerify } from '../services/payment-review';
import {
  cancelReservation,
  extendReservation,
  recordManualPayment,
  REJECTION_REASONS,
  reviewProof,
} from '../services/payments';
import { cancelEvent, decideRefund } from '../services/refunds';
import { protectedProcedure, router } from '../trpc';
import { schema } from '@doulisha/db';
import { eq } from 'drizzle-orm';

const eventId = z.object({ eventId: z.uuid() });

/** Organizer tools (ACC-03, ORG-01, PRT-01 to PRT-05, TKT-05, PAY-04). */
export const organizerRouter = router({
  /** The member's organizer profiles. */
  profiles: protectedProcedure.query(({ ctx }) => listOwnProfiles(ctx.db, ctx.actor)),

  /** Creates an organizer profile and grants the organizer role. */
  createProfile: protectedProcedure
    .input(organizerProfileInputSchema)
    .mutation(({ ctx, input }) => createProfile(ctx.db, ctx.deps, ctx.actor, input)),

  /** Updates one of the member's organizer profiles. */
  updateProfile: protectedProcedure
    .input(organizerProfileInputSchema.extend({ id: z.uuid() }))
    .mutation(({ ctx, input }) => updateProfile(ctx.db, ctx.deps, ctx.actor, input.id, input)),

  /** The member's organizer profile with its photos (null if none). */
  myProfile: protectedProcedure.query(({ ctx }) => getOwnProfileDetail(ctx.db, ctx.actor)),

  /** Adds an uploaded photo of a past event to the profile (at most 12). */
  addPhoto: protectedProcedure
    .input(
      z.object({
        profileId: z.uuid(),
        key: z.string().min(10).max(300),
        caption: z.string().trim().max(120).nullish(),
      }),
    )
    .mutation(({ ctx, input }) => addPhoto(ctx.db, ctx.deps, ctx.actor, input)),

  removePhoto: protectedProcedure
    .input(z.object({ photoId: z.uuid() }))
    .mutation(({ ctx, input }) => removePhoto(ctx.db, ctx.actor, input.photoId)),

  /** ORG-01: upcoming events, fill rate, revenue, pending payments, booking sources. */
  dashboard: protectedProcedure.query(({ ctx }) => organizerDashboard(ctx.db, ctx.actor)),

  /** PRT-01: attendees with payment status, answers, notes, proofs and refund requests. */
  attendees: protectedProcedure
    .input(eventId)
    .query(({ ctx, input }) => listAttendees(ctx.db, ctx.actor, input.eventId)),

  /** SHR-04: bookings per source for one event. */
  sources: protectedProcedure
    .input(eventId)
    .query(({ ctx, input }) => eventSources(ctx.db, ctx.actor, input.eventId)),

  /** PRT-02: adds someone who booked by phone or WhatsApp. */
  addAttendee: protectedProcedure
    .input(manualAttendeeSchema)
    .mutation(({ ctx, input }) => addManualAttendee(ctx.db, ctx.deps, ctx.actor, input)),

  /** Private note on an attendee. */
  setNote: protectedProcedure
    .input(z.object({ attendeeId: z.uuid(), notes: z.string().trim().max(500).nullable() }))
    .mutation(({ ctx, input }) =>
      setAttendeeNote(ctx.db, ctx.actor, input.attendeeId, input.notes),
    ),

  /** PRT-03 payments inbox: receipts to verify, reservations awaiting payment, confirmed. */
  payments: protectedProcedure
    .input(z.object({ eventId: z.uuid().optional() }))
    .query(({ ctx, input }) => paymentsInbox(ctx.db, ctx.deps, ctx.actor, input.eventId)),

  /** Receipts waiting for review on all the member's events (badge). */
  receiptsToVerify: protectedProcedure.query(({ ctx }) => receiptsToVerify(ctx.db, ctx.actor)),

  /**
   * PRT-03: the organizer confirms a payment received without a receipt
   * (cash, or a D17 or transfer they checked). Refused while a receipt awaits
   * review: that receipt must be approved or rejected instead.
   */
  markPaid: protectedProcedure
    .input(
      z.object({
        orderId: z.uuid(),
        method: z.enum(['cash', 'bank_transfer', 'd17']),
        transactionRef: z.string().trim().max(60).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await loadManagedOrder(ctx.db, ctx.actor, input.orderId);
      await recordManualPayment(
        ctx.deps,
        ctx.actor.userId,
        input.orderId,
        input.method,
        new Date(),
        {
          transactionRef: input.transactionRef ?? null,
          notifyDb: ctx.db,
        },
      );
    }),

  /** PRT-03: approves a receipt (payment recorded, QR codes issued) or rejects it with a reason. */
  reviewProof: protectedProcedure
    .input(
      z.discriminatedUnion('approve', [
        z.object({
          eventId: z.uuid(),
          proofId: z.uuid(),
          approve: z.literal(true),
          transactionRef: z.string().trim().max(60).nullish(),
        }),
        z.object({
          eventId: z.uuid(),
          proofId: z.uuid(),
          approve: z.literal(false),
          reason: z.enum(REJECTION_REASONS),
          note: z.string().trim().max(300).nullish(),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      await loadManagedEvent(ctx.db, ctx.actor, input.eventId);
      await assertBelongsToEvent(ctx.db, 'proof', input.proofId, input.eventId);
      await reviewProof(
        ctx.deps,
        ctx.db,
        ctx.actor.userId,
        input.proofId,
        input.approve
          ? { approve: true, transactionRef: input.transactionRef ?? null }
          : { approve: false, reason: input.reason, note: input.note ?? null },
      );
    }),

  /** Gives a buyer one more day to pay a reservation. */
  extendReservation: protectedProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await loadManagedOrder(ctx.db, ctx.actor, input.orderId);
      return extendReservation(ctx.db, input.orderId);
    }),

  /** Cancels an unpaid reservation; the places go back to the waitlist. */
  cancelReservation: protectedProcedure
    .input(z.object({ orderId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await loadManagedOrder(ctx.db, ctx.actor, input.orderId);
      await cancelReservation(ctx.deps, ctx.db, input.orderId);
    }),

  /** PAY-04: approves or rejects a refund request. */
  decideRefund: protectedProcedure
    .input(z.object({ eventId: z.uuid(), refundId: z.uuid(), approve: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await loadManagedEvent(ctx.db, ctx.actor, input.eventId);
      await assertBelongsToEvent(ctx.db, 'refund', input.refundId, input.eventId);
      await decideRefund(ctx.deps, ctx.actor.userId, input.refundId, input.approve);
    }),

  /**
   * TKT-05: checks a ticket in by its code (from the QR). With money still
   * due, answers `payment_due`; `collect: true` records the cash and checks in.
   */
  checkIn: protectedProcedure
    .input(
      eventId.extend({ code: z.string().trim().min(6).max(20), collect: z.boolean().optional() }),
    )
    .mutation(({ ctx, input }) =>
      checkIn(ctx.db, ctx.deps, ctx.actor, input.eventId, input.code, {
        collect: input.collect ?? false,
      }),
    ),

  /** Cancels the whole event and refunds everyone in full. */
  cancelEvent: protectedProcedure.input(eventId).mutation(async ({ ctx, input }) => {
    await loadManagedEvent(ctx.db, ctx.actor, input.eventId);
    return cancelEvent(ctx.deps, ctx.actor.userId, input.eventId);
  }),
});

/** The event of an order the actor manages; NOT_FOUND otherwise. */
async function loadManagedOrder(
  db: Parameters<typeof loadManagedEvent>[0],
  actor: Parameters<typeof loadManagedEvent>[1],
  orderId: string,
) {
  const [order] = await db
    .select({ eventId: schema.orders.eventId })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order?.eventId) throw new AppError('NOT_FOUND', 'errors.notFound');
  await loadManagedEvent(db, actor, order.eventId);
  return order.eventId;
}

/** Refuses ids that belong to another event (defence against id guessing). */
async function assertBelongsToEvent(
  db: Parameters<typeof loadManagedEvent>[0],
  kind: 'proof' | 'refund',
  id: string,
  eventId: string,
) {
  const rows =
    kind === 'proof'
      ? await db
          .select({ eventId: schema.orders.eventId })
          .from(schema.paymentProofs)
          .innerJoin(schema.payments, eq(schema.payments.id, schema.paymentProofs.paymentId))
          .innerJoin(schema.orders, eq(schema.orders.id, schema.payments.orderId))
          .where(eq(schema.paymentProofs.id, id))
      : await db
          .select({ eventId: schema.orders.eventId })
          .from(schema.refunds)
          .innerJoin(schema.orders, eq(schema.orders.id, schema.refunds.orderId))
          .where(eq(schema.refunds.id, id));
  if (rows[0]?.eventId !== eventId) throw new AppError('NOT_FOUND', 'errors.notFound');
}
