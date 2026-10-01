import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { EventCardSkeleton } from './event-card';

type Variant = 'grid' | 'list' | 'event' | 'dashboard' | 'detail';

const widths: Record<Variant, string> = {
  grid: 'max-w-7xl',
  list: 'max-w-3xl',
  event: 'max-w-6xl',
  dashboard: 'max-w-7xl',
  detail: 'max-w-3xl',
};

/**
 * Loading state of a page, shaped like the page it stands for
 * (UX_GUIDELINES.md, "Required states"). `bare` drops the page container when
 * the layout already provides one (organizer space, host).
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
      {variant === 'event' ? (
        <EventSkeleton />
      ) : variant === 'grid' ? (
        <GridSkeleton />
      ) : variant === 'dashboard' ? (
        <DashboardSkeleton />
      ) : variant === 'detail' ? (
        <DetailSkeleton />
      ) : (
        <ListSkeleton />
      )}
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

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <TitleSkeleton />
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card"
          >
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <ListSkeleton />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
        <Skeleton className="aspect-[3/1] w-full rounded-none" />
        <div className="space-y-2 p-5">
          <Skeleton className="h-5 w-1/2 rounded-full" />
          <Skeleton className="h-4 w-1/3 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-3xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="aspect-[16/9] w-full rounded-3xl sm:aspect-[21/9]" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Skeleton className="h-9 w-3/4 rounded-full" />
          <Skeleton className="h-4 w-1/2 rounded-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="hidden h-80 rounded-3xl lg:block" />
      </div>
    </div>
  );
}
