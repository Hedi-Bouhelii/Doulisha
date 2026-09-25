'use client';

import { TRPCClientError } from '@trpc/client';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

/**
 * Turns any error into a translated message. API errors carry an i18n key
 * such as "errors.soldOut" (docs/API.md), shown from the `Errors` messages.
 */
export function useErrorMessage() {
  const t = useTranslations('Errors');
  return useCallback(
    (error: unknown): string => {
      const key = error instanceof TRPCClientError ? error.message : '';
      const match = /^errors\.(\w+)$/.exec(key);
      if (match?.[1] && t.has(match[1] as never)) return t(match[1] as never);
      return t('generic');
    },
    [t],
  );
}
