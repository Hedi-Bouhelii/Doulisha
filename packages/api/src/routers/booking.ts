import { createBookingSchema } from '@doulisha/validators';
import { z } from 'zod';

import { createBooking, getCheckoutOptions } from '../services/booking';
import { attachProof, changeManualMethod, payOnline } from '../services/payments';
import { cancelOwnBooking } from '../services/refunds';
import { getMyOrder, listMyOrders } from '../services/tickets';
import { publicProcedure, router } from '../trpc';

const reference = z.object({ reference: z.string().regex(/^DLS-[A-Z0-9]{6}$/) });

/**
 * Checkout and "My tickets" (PAY-01 to PAY-04, TKT-01 to TKT-04). Buyers can be
 * members or guests with an anonymous session, hence public procedures that
 * check the actor in the service.
 */
export const bookingRouter = router({
  /** Tickets, questions, meeting points and payment methods of an event. */
  options: publicProcedure
    .input(z.object({ eventId: z.uuid() }))
    .query(({ ctx, input }) => getCheckoutOptions(ctx.db, input.eventId)),

  /** Books places (or joins the waitlist). Returns the reference and, for online payment, the gateway URL. */
  create: publicProcedure
    .input(createBookingSchema)
    .mutation(({ ctx, input }) => createBooking(ctx.db, ctx.deps, ctx.actor, input, ctx.locale)),

  /** The buyer's orders. */
  mine: publicProcedure.query(({ ctx }) => listMyOrders(ctx.db, ctx.actor)),

  /** One of the buyer's orders with its tickets (QR codes once confirmed). */
  byReference: publicProcedure
    .input(reference)
    .query(({ ctx, input }) => getMyOrder(ctx.db, ctx.actor, input.reference)),

  /** Pays online what is due: retry, waitlist offer or deposit balance (PAY-03). */
  payOnline: publicProcedure.input(reference).mutation(async ({ ctx, input }) => ({
    redirectUrl: await payOnline(ctx.db, ctx.deps, ctx.actor, input.reference, ctx.locale),
  })),

  /** Attaches an uploaded proof of transfer or D17 payment. */
  attachProof: publicProcedure
    .input(reference.extend({ fileKey: z.string().min(10).max(300) }))
    .mutation(({ ctx, input }) => attachProof(ctx.db, ctx.actor, input.reference, input.fileKey)),

  /** Cancels the booking; a refund from the policy goes to the organizer for approval (PAY-04). */
  cancel: publicProcedure
    .input(reference)
    .mutation(({ ctx, input }) => cancelOwnBooking(ctx.db, ctx.deps, ctx.actor, input.reference)),

  /** "Pay differently": switch between D17, transfer and cash before paying. */
  changeMethod: publicProcedure
    .input(reference.extend({ method: z.enum(['cash', 'bank_transfer', 'd17']) }))
    .mutation(({ ctx, input }) =>
      changeManualMethod(ctx.db, ctx.actor, input.reference, input.method),
    ),
});
