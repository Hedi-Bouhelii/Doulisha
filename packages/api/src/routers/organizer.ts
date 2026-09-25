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
import { createProfile, listOwnProfiles, updateProfile } from '../services/organizers';
import { recordManualPayment, reviewProof } from '../services/payments';
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
    .mutation(({ ctx, input }) => createProfile(ctx.db, ctx.actor, input)),

  /** Updates one of the member's organizer profiles. */
  updateProfile: protectedProcedure
    .input(organizerProfileInputSchema.extend({ id: z.uuid() }))
    .mutation(({ ctx, input }) => updateProfile(ctx.db, ctx.actor, input.id, input)),

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

  /** PRT-03: marks cash, transfer or D17 as received for an order. */
  markPaid: protectedProcedure
    .input(z.object({ orderId: z.uuid(), method: z.enum(['cash', 'bank_transfer', 'd17']) }))
    .mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select({ eventId: schema.orders.eventId })
        .from(schema.orders)
        .where(eq(schema.orders.id, input.orderId));
      if (!order?.eventId) throw new AppError('NOT_FOUND', 'errors.notFound');
      await loadManagedEvent(ctx.db, ctx.actor, order.eventId);
      await recordManualPayment(ctx.deps, ctx.actor.userId, input.orderId, input.method);
    }),

  /** PRT-03: approves or rejects an uploaded payment proof. */
  reviewProof: protectedProcedure
    .input(z.object({ eventId: z.uuid(), proofId: z.uuid(), approve: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await loadManagedEvent(ctx.db, ctx.actor, input.eventId);
      await assertBelongsToEvent(ctx.db, 'proof', input.proofId, input.eventId);
      await reviewProof(ctx.deps, ctx.actor.userId, input.proofId, input.approve);
    }),

  /** PAY-04: approves or rejects a refund request. */
  decideRefund: protectedProcedure
    .input(z.object({ eventId: z.uuid(), refundId: z.uuid(), approve: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await loadManagedEvent(ctx.db, ctx.actor, input.eventId);
      await assertBelongsToEvent(ctx.db, 'refund', input.refundId, input.eventId);
      await decideRefund(ctx.deps, ctx.actor.userId, input.refundId, input.approve);
    }),

  /** TKT-05: checks a ticket in by its code (from the QR). */
  checkIn: protectedProcedure
    .input(eventId.extend({ code: z.string().trim().min(6).max(20) }))
    .mutation(({ ctx, input }) => checkIn(ctx.db, ctx.actor, input.eventId, input.code)),

  /** Cancels the whole event and refunds everyone in full. */
  cancelEvent: protectedProcedure.input(eventId).mutation(async ({ ctx, input }) => {
    await loadManagedEvent(ctx.db, ctx.actor, input.eventId);
    return cancelEvent(ctx.deps, ctx.actor.userId, input.eventId);
  }),
});

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
