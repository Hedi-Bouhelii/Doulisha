import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';

/** Loading state of a conversation, shaped like the chat panel. */
export default function Loading() {
  const t = useTranslations('States');
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-8"
    >
      <span className="sr-only">{t('loading')}</span>
      <Skeleton className="h-4 w-32 rounded-full" />
      <Skeleton className="h-8 w-64 max-w-full rounded-full" />
      <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-card">
        <Skeleton className="h-10 w-2/3 rounded-2xl" />
        <Skeleton className="ms-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="h-16 w-3/4 rounded-2xl" />
        <Skeleton className="mt-6 h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
