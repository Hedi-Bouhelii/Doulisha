'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/** Error boundary for every page: friendly message, a retry and a way home. */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('States');
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <EmptyState
        tone="alert"
        icon={AlertTriangle}
        className="w-full"
        title={t('errorTitle')}
        hint={t('errorHint')}
        action={<Button onClick={reset}>{t('retry')}</Button>}
        secondaryAction={
          <Button asChild variant="outline">
            <Link href="/">{t('backHome')}</Link>
          </Button>
        }
      />
    </main>
  );
}
