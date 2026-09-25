'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Button } from '@/components/ui/button';

/** Error boundary for every page: friendly message and a retry. */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('States');
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <EmptyState
        tone="alert"
        className="w-full"
        title={t('errorTitle')}
        hint={t('errorHint')}
        action={
          <Button onClick={reset} className="min-h-11">
            {t('retry')}
          </Button>
        }
      />
    </main>
  );
}
