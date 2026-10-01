import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { EventCardSkeleton } from './event-card';

type Variant = 'grid' | 'list';

const widths: Record<Variant, string> = {
  grid: 'max-w-7xl',
  list: 'max-w-3xl',
};

/**
 * Loading state of a list page, shaped like the page it stands for
 * (UX_GUIDELINES.md, "Required states"). Only for routes that never answer
 * 404 or redirect: a streamed response is always 200. `bare` drops the page
 * container when the layout already provides one (host).
 */
export function PageSkeleton({ variant, bare = false }: { variant: Variant; bare?: boolean }) {
  const t = useTranslations('States');
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(!bare && 'mx-auto w-full px-4 py-8 sm:px-6 sm:py-10', !bare && widths[variant])}
    >
      <span className="sr-only">{t('loading')}</span>
      {variant === 'grid' ? <GridSkeleton /> : <ListSkeleton />}
    </div>
  );
}

function TitleSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-56 max-w-full rounded-full" />
      <Skeleton className="h-4 w-80 max-w-full rounded-full" />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-8">
      <TitleSkeleton />
      <Skeleton className="h-12 w-full rounded-full" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      <TitleSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card"
          >
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded-full" />
              <Skeleton className="h-3 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
