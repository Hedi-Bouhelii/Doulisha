import type { EventCardDto } from '@doulisha/api';
import { formatEventDateTime, type Locale } from '@doulisha/i18n';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { accentOf, CategoryIcon } from './category-icon';
import { PriceTag } from './price-tag';

/**
 * Event card (design system v2): the cover leads, then title, date, place,
 * price and availability, in that order of importance. The whole card is one
 * link and lifts slightly on hover.
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
        'group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-raised',
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
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={cn('flex size-full items-center justify-center', accent.tile)}>
            <CategoryIcon name={event.category.icon} className="size-10" />
          </div>
        )}
        <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs backdrop-blur-sm">
          <CategoryIcon name={event.category.icon} className={cn('size-3.5', accent.icon)} />
          {event.category.name}
        </span>
        {isFull || fewLeft ? (
          <span
            className={cn(
              'absolute end-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xs',
              isFull ? 'bg-foreground text-background' : 'bg-highlight text-highlight-foreground',
            )}
          >
            {isFull ? t('full') : t('placesLeft', { count: event.placesLeft ?? 0 })}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 font-sans text-base leading-snug font-semibold tracking-normal">
          {event.title}
        </h3>
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-primary">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <time dateTime={event.startsAt.toISOString()}>
              {formatEventDateTime(event.startsAt, locale)}
            </time>
          </p>
          {event.city || event.venueName ? (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {[event.venueName, event.city].filter(Boolean).join(' · ')}
              </span>
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <PriceTag millimes={event.priceFromMillimes} className="text-base" />
          {event.placesTaken > 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" aria-hidden="true" />
              {t('going', { count: event.placesTaken })}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** Loading placeholder with the same shape as EventCard. */
export function EventCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card"
    >
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="flex flex-col gap-2.5 p-4">
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted" />
        <div className="h-3.5 w-3/5 animate-pulse rounded-full bg-muted" />
        <div className="h-3.5 w-2/5 animate-pulse rounded-full bg-muted" />
        <div className="mt-2 flex justify-between border-t border-border/60 pt-3">
          <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
