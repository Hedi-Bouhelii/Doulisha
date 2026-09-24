import type { EventCardDto } from '@doulisha/api';
import { formatEventDateTime, type Locale } from '@doulisha/i18n';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { accentOf, CategoryIcon } from './category-icon';
import { PriceTag } from './price-tag';

/**
 * Event card (template "Trending events"): photo, title, place and date,
 * tags, people going and price. The whole card is one link.
 */
export function EventCard({
  event,
  priority = false,
  className,
}: {
  event: EventCardDto;
  priority?: boolean;
  className?: string;
}) {
  const t = useTranslations('Event');
  const locale = useLocale() as Locale;
  const accent = accentOf(event.category.accent);
  const isFull = event.placesLeft === 0;
  const fewLeft =
    !isFull && event.capacity !== null && event.placesLeft !== null && event.placesLeft <= 5;

  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 90vw"
            className="object-cover transition-transform duration-250 group-hover:scale-[1.03]"
          />
        ) : (
          <div className={cn('flex size-full items-center justify-center', accent.tile)}>
            <CategoryIcon name={event.category.icon} className="size-10" />
          </div>
        )}
        {isFull || fewLeft ? (
          <span
            className={cn(
              'absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm',
              isFull ? 'bg-foreground text-background' : 'bg-highlight text-highlight-foreground',
            )}
          >
            {isFull ? t('full') : t('placesLeft', { count: event.placesLeft ?? 0 })}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 font-sans text-base leading-snug font-semibold">
          {event.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {event.city ? `${event.city} · ` : ''}
          <time dateTime={event.startsAt.toISOString()}>
            {formatEventDateTime(event.startsAt, locale)}
          </time>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', accent.tile)}>
            {event.category.name}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {event.templateName}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-highlight" />
            {t('going', { count: event.placesTaken })}
          </span>
          <PriceTag millimes={event.priceFromMillimes} className="text-sm" />
        </div>
      </div>
    </Link>
  );
}

/** Loading placeholder with the same shape as EventCard. */
export function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
