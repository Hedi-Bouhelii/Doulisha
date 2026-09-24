import { adminRouter } from './routers/admin';
import { catalogRouter } from './routers/catalog';
import { eventsRouter } from './routers/events';
import { healthRouter } from './routers/health';
import { meRouter } from './routers/me';
import { createCallerFactory, router } from './trpc';

/** Every router of the Doulisha API (listed in docs/API.md). */
export const appRouter = router({
  health: healthRouter,
  me: meRouter,
  catalog: catalogRouter,
  events: eventsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

/** Server-side caller for React Server Components. */
export const createCaller = createCallerFactory(appRouter);
