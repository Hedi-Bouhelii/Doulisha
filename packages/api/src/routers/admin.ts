import { z } from 'zod';

import { explorableTableNames, tableOverview, tableRows } from '../services/admin';
import { roleProcedure, router } from '../trpc';

const adminProcedure = roleProcedure('admin');

export const adminRouter = router({
  /** Admins only: row count of every table the data explorer can show. */
  tables: adminProcedure.query(({ ctx }) => tableOverview(ctx.db)),

  /** Admins only: latest rows of one table (seed data check, Phase 1 acceptance). */
  rows: adminProcedure
    .input(
      z.object({
        table: z.enum(explorableTableNames as [string, ...string[]]),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(({ ctx, input }) =>
      tableRows(ctx.db, input.table as (typeof explorableTableNames)[number], input.limit),
    ),
});
