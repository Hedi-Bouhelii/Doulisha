/**
 * @doulisha/api: tRPC routers (thin), services (business rules) and permissions.
 * Layering: UI → router → service → Drizzle (docs/ARCHITECTURE.md).
 */
export { createContext, type Context } from './context';
export type { ServiceDeps } from './deps';
export { publishProblems, type PublishProblem } from './domain/publish';
export { quoteOrder } from './domain/pricing';
export { handlePaymentEvent } from './services/payments';
export { getProofForViewer } from './services/tickets';
export { loadManagedEvent } from './services/event-editor';
export { listAttendees, type AttendeePayment } from './services/organizer-tools';
export { AppError, type AppErrorCode } from './errors';
export * from './permissions';
export { appRouter, createCaller, type AppRouter } from './root';
export type { CategoryDto } from './services/catalog';
export type { EventDetailDto } from './services/event-detail';
export type { EventCardDto } from './services/events';
