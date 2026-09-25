import { publicProcedure, router } from '../trpc';

export const healthRouter = router({
  /** Liveness check used by monitoring and the E2E tests. Returns the server time. */
  ping: publicProcedure.query(() => ({ ok: true as const, time: new Date() })),
});
