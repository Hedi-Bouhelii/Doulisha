import { z } from 'zod';

import { getEventBySlug } from '../services/event-detail';
import { listSitemapEvents, listUpcomingPublicEvents } from '../services/events';
import { publicProcedure, router } from '../trpc';

export const eventsRouter = router({
  /**
   * Upcoming public events for the home and explore pages, soonest first.
   * Never returns private, unlisted, draft, deleted or past events.
   * Filters (DSC-01, DSC-02): category, city, free text, date preset, price,
   * "for whom", places left and distance.
   */
  upcoming: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(8),
        categorySlug: z.string().max(40).optional(),
        query: z.string().trim().max(80).optional(),
        city: z.string().trim().max(60).optional(),
        when: z.enum(['today', 'tonight', 'weekend', 'week', 'month']).optional(),
        price: z.enum(['free', 'paid']).optional(),
        maxPriceMillimes: z.number().int().min(0).optional(),
        audience: z
          .array(z.enum(['solo', 'couple', 'friends', 'family', 'kids']))
          .max(5)
          .optional(),
        available: z.boolean().optional(),
        near: z
          .object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
            radiusKm: z.number().min(1).max(300).default(30),
          })
          .optional(),
      }),
    )
    .query(({ ctx, input }) => listUpcomingPublicEvents(ctx.db, ctx.locale, input)),

  /**
   * One event page (DSC-03). Public and unlisted events only; private events,
   * drafts and deleted events return NOT_FOUND.
   */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(({ ctx, input }) => getEventBySlug(ctx.db, ctx.locale, input.slug, ctx.actor)),

  /** Slugs of public upcoming events, for sitemap.xml. */
  sitemap: publicProcedure.query(({ ctx }) => listSitemapEvents(ctx.db)),
});
