import { z } from 'zod';

import { listUpcomingPublicEvents } from '../services/events';
import { publicProcedure, router } from '../trpc';

export const eventsRouter = router({
  /**
   * Upcoming public events for the home page and cards, soonest first.
   * Never returns private, unlisted, draft, deleted or past events.
   */
  upcoming: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(8),
        categorySlug: z.string().max(40).optional(),
      }),
    )
    .query(({ ctx, input }) => listUpcomingPublicEvents(ctx.db, ctx.locale, input)),
});
