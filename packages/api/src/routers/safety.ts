import { z } from 'zod';

import { REPORT_REASONS, REPORT_TARGETS } from '../domain/wall-rules';
import { blockUser, listBlocked, unblockUser } from '../services/blocks';
import { createReport } from '../services/reports';
import { protectedProcedure, router } from '../trpc';

const userInput = z.object({ userId: z.uuid() });

/** TRS-03 report and block (ADR 0022). */
export const safetyRouter = router({
  /** Report an event, post, comment, member, organizer or chat message. */
  report: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(REPORT_TARGETS),
        targetId: z.uuid(),
        reason: z.enum(REPORT_REASONS),
        details: z.string().trim().max(1000).nullish(),
      }),
    )
    .mutation(({ ctx, input }) => createReport(ctx.db, ctx.actor, input)),

  block: protectedProcedure
    .input(userInput)
    .mutation(({ ctx, input }) => blockUser(ctx.db, ctx.actor, input.userId)),

  unblock: protectedProcedure
    .input(userInput)
    .mutation(({ ctx, input }) => unblockUser(ctx.db, ctx.actor, input.userId)),

  /** People the member blocked ("My account"). */
  blocked: protectedProcedure.query(({ ctx }) => listBlocked(ctx.db, ctx.actor)),
});
