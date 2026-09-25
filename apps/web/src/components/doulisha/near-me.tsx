'use client';

import { useQuery } from '@tanstack/react-query';
import { LocateFixed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTRPC } from '@/trpc/client';

import { EventCard, EventCardSkeleton } from './event-card';

type Position = { lat: number; lng: number };

/** Asks the browser for the position once; null when refused or unavailable. */
export function locate(): Promise<Position | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  });
}

/**
 * Home rail "Near me" (DSC-04): nothing is asked until the visitor taps the
 * button, then events within 30 km are listed.
 */
export function NearMeRail() {
  const t = useTranslations('Explore');
  const tHome = useTranslations('Home');
  const tStates = useTranslations('States');
  const trpc = useTRPC();
  const [state, setState] = useState<'idle' | 'locating' | 'denied' | Position>('idle');
  const position = typeof state === 'object' ? state : null;
  const events = useQuery({
    ...trpc.events.upcoming.queryOptions({
      limit: 8,
      near: { lat: position?.lat ?? 0, lng: position?.lng ?? 0, radiusKm: 30 },
    }),
    enabled: position !== null,
  });

  async function start() {
    setState('locating');
    setState((await locate()) ?? 'denied');
  }

  if (!position) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-5">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => void start()}
          disabled={state === 'locating'}
        >
          <LocateFixed aria-hidden="true" />
          {state === 'locating' ? t('locating') : tHome('nearMe')}
        </Button>
        {state === 'denied' ? (
          <p className="text-sm text-muted-foreground">{t('locationDenied')}</p>
        ) : null}
      </div>
    );
  }
  if (events.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (events.isError || !events.data?.length) {
    return <p className="text-sm text-muted-foreground">{tStates('emptyEventsHint')}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {events.data.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
