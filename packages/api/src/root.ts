import { accountRouter } from './routers/account';
import { adminRouter } from './routers/admin';
import { bookingRouter } from './routers/booking';
import { editorRouter } from './routers/editor';
import { invitationsRouter } from './routers/invitations';
import { organizerRouter } from './routers/organizer';
import { organizersRouter } from './routers/organizers';
import { uploadsRouter } from './routers/uploads';
import { catalogRouter } from './routers/catalog';
import { eventsRouter } from './routers/events';
import { healthRouter } from './routers/health';
import { meRouter } from './routers/me';
import { createCallerFactory, router } from './trpc';

/** Every router of the Doulisha API (listed in docs/API.md). */
export const appRouter = router({
  health: healthRouter,
  me: meRouter,
  account: accountRouter,
  catalog: catalogRouter,
  events: eventsRouter,
  editor: editorRouter,
  booking: bookingRouter,
  organizer: organizerRouter,
  organizers: organizersRouter,
  invitations: invitationsRouter,
  uploads: uploadsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

/** Server-side caller for React Server Components. */
export const createCaller = createCallerFactory(appRouter);
