import { quickPrivateEventSchema, rsvpInputSchema } from '@doulisha/validators';
import { z } from 'zod';

import {
  createQuickPrivateEvent,
  getInvitation,
  getOrCreateLinkInvitation,
  listHostedPrivateEvents,
  respondToInvitation,
} from '../services/invitations';
import { protectedProcedure, publicProcedure, router } from '../trpc';

/** Private events and invitations (INV-01 to INV-03). */
export const invitationsRouter = router({
  /** INV-01: creates and publishes a private event; returns the invitation token. */
  quickCreate: protectedProcedure
    .input(quickPrivateEventSchema)
    .mutation(({ ctx, input }) =>
      createQuickPrivateEvent(ctx.db, ctx.deps, ctx.actor, input, ctx.locale),
    ),

  /** The shareable link token of one of the host's events. */
  link: protectedProcedure
    .input(z.object({ eventId: z.uuid() }))
    .query(({ ctx, input }) => getOrCreateLinkInvitation(ctx.db, ctx.actor, input.eventId)),

  /** The host's private events. */
  hosted: protectedProcedure.query(({ ctx }) => listHostedPrivateEvents(ctx.db, ctx.actor)),

  /** INV-02: the invitation page data. The guest list is only returned to the host and to guests who answered. */
  byToken: publicProcedure
    .input(z.object({ token: z.string().min(8).max(64) }))
    .query(({ ctx, input }) => getInvitation(ctx.db, ctx.actor, input.token)),

  /** INV-03: answer (guests use an anonymous session and give their name). */
  respond: publicProcedure
    .input(rsvpInputSchema)
    .mutation(({ ctx, input }) => respondToInvitation(ctx.db, ctx.actor, input)),
});
