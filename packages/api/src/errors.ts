import { TRPCError } from '@trpc/server';

/** Error codes services may throw; each maps to one HTTP-like tRPC code. */
export type AppErrorCode =
  'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'TOO_MANY_REQUESTS';

/**
 * Thrown by services for expected failures. `messageKey` is a key in the
 * i18n messages (e.g. "errors.forbidden") so clients show it in the user's language.
 */
export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly messageKey: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(messageKey);
    this.name = 'AppError';
  }
}

export function toTRPCError(error: AppError): TRPCError {
  return new TRPCError({ code: error.code, message: error.messageKey, cause: error });
}
