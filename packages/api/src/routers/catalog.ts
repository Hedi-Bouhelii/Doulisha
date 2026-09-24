import { listCategories } from '../services/catalog';
import { publicProcedure, router } from '../trpc';

export const catalogRouter = router({
  /** Active categories (spec 1.3) in display order, named in the request locale. */
  categories: publicProcedure.query(({ ctx }) => listCategories(ctx.db, ctx.locale)),
});
