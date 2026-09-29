import { z } from 'zod';

import { getMemberProfile } from '../services/members';
import { publicProcedure, router } from '../trpc';

/** Member pages (ACC-02, ACC-06, ADR 0022). */
export const membersRouter = router({
  byId: publicProcedure
    .input(z.object({ userId: z.uuid() }))
    .query(({ ctx, input }) => getMemberProfile(ctx.db, ctx.locale, ctx.actor, input.userId)),
});
