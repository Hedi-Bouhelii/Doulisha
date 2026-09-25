/**
 * @doulisha/api: tRPC routers (thin), services (business rules) and permissions.
 * Layering: UI → router → service → Drizzle (docs/ARCHITECTURE.md).
 */
export { createContext, type Context } from './context';
export { AppError, type AppErrorCode } from './errors';
export * from './permissions';
export { appRouter, createCaller, type AppRouter } from './root';
export type { CategoryDto } from './services/catalog';
export type { EventDetailDto } from './services/event-detail';
export type { EventCardDto } from './services/events';
