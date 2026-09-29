import { z } from 'zod';

import { getPublicProfile } from '../services/organizers';
import { publicProcedure, router } from '../trpc';

/** Public organizer pages (ACC-03). */
export const organizersRouter = router({
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(({ ctx, input }) => getPublicProfile(ctx.db, ctx.locale, input.slug)),
});
