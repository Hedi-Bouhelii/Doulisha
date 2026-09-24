import { z } from 'zod';

import { getEventBySlug } from '../services/event-detail';
import { listUpcomingPublicEvents } from '../services/events';
import { publicProcedure, router } from '../trpc';

export const eventsRouter = router({
  /**
   * Upcoming public events for the home and explore pages, soonest first.
   * Never returns private, unlisted, draft, deleted or past events.
   * Optional filters: category slug, city, and free text (title or city).
   */
  upcoming: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(8),
        categorySlug: z.string().max(40).optional(),
        query: z.string().trim().max(80).optional(),
        city: z.string().trim().max(60).optional(),
      }),
    )
    .query(({ ctx, input }) => listUpcomingPublicEvents(ctx.db, ctx.locale, input)),

  /**
   * One event page (DSC-03). Public and unlisted events only; private events,
   * drafts and deleted events return NOT_FOUND.
   */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(({ ctx, input }) => getEventBySlug(ctx.db, ctx.locale, input.slug)),
});
