import { z } from 'zod';

import { followOrganizer, getFeed, unfollowOrganizer } from '../services/follows';
import { getPublicProfile } from '../services/organizers';
import { protectedProcedure, publicProcedure, router } from '../trpc';

const organizerInput = z.object({ organizerProfileId: z.uuid() });

/** Public organizer pages (ACC-03), following and the feed (SOC-01, SOC-03). */
export const organizersRouter = router({
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(({ ctx, input }) => getPublicProfile(ctx.db, ctx.locale, input.slug, ctx.actor)),

  follow: protectedProcedure
    .input(organizerInput)
    .mutation(({ ctx, input }) => followOrganizer(ctx.db, ctx.actor, input.organizerProfileId)),

  unfollow: protectedProcedure
    .input(organizerInput)
    .mutation(({ ctx, input }) => unfollowOrganizer(ctx.db, ctx.actor, input.organizerProfileId)),

  /** Upcoming events of followed organizers, and organizers to follow. */
  feed: protectedProcedure.query(({ ctx }) => getFeed(ctx.db, ctx.actor, ctx.locale)),
});
