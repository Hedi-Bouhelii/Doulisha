import type { UserRole } from '@doulisha/auth';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z, ZodError } from 'zod';

import type { Context } from './context';
import { AppError, toTRPCError } from './errors';
import { assertRole } from './permissions';

/**
 * Error format shared by every procedure:
 * - `message` is an i18n key (e.g. "errors.forbidden") for expected errors;
 * - `data.fieldErrors` lists invalid input fields (Zod);
 * - `data.details` carries extra context from AppError.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    const isInternal = error.code === 'INTERNAL_SERVER_ERROR';
    return {
      ...shape,
      // Never leak internal messages to clients.
      message: isInternal ? 'errors.internal' : shape.message,
      data: {
        ...shape.data,
        stack: undefined,
        fieldErrors: cause instanceof ZodError ? z.flattenError(cause).fieldErrors : undefined,
        details: cause instanceof AppError ? cause.details : undefined,
      },
    };
  },
});

/** Converts AppError thrown by services into the matching TRPCError. */
const appErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.cause instanceof AppError) {
    throw toTRPCError(result.error.cause);
  }
  return result;
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Anyone, including visitors without a session. */
export const publicProcedure = t.procedure.use(appErrors);

/** Signed-in members (guests with an anonymous session are refused). */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.actor || ctx.actor.isAnonymous) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'errors.signInRequired' });
  }
  return next({ ctx: { ...ctx, actor: ctx.actor } });
});

/** Members holding one of the roles (admins always pass). */
export function roleProcedure(...roles: UserRole[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    assertRole(ctx.actor, ...roles);
    return next();
  });
}
