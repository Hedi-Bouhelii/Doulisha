import { formatEventDateTime, formatPercent, formatPrice } from '@doulisha/i18n';
import { CalendarDays, CalendarPlus, Ticket } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { api } from '@/trpc/server';

import { SourceBars } from './source-bars';
import { StatusBadge } from './status-badge';

/** ORG-01 dashboard: key figures, booking sources and every event the member manages. */
export default async function OrganizerDashboardPage({ params }: PageProps<'/[locale]/organizer'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations('Organizer');
  const caller = await api();
  const [dashboard, events] = await Promise.all([
    caller.organizer.dashboard(),
    caller.editor.myEvents(),
  ]);
  const revenue = new Map(dashboard.events.map((e) => [e.id, e]));
  const totalSources = dashboard.sources.reduce((sum, s) => sum + s.orders, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
        <Button asChild className="min-h-11 rounded-full">
          <Link href="/organizer/events/new" data-testid="create-event">
            <CalendarPlus aria-hidden="true" />
            {t('createEvent')}
          </Link>
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('kpi.upcoming')} value={String(dashboard.totals.upcomingEvents)} />
        <Kpi
          label={t('kpi.fillRate')}
          value={
            dashboard.totals.fillRate === null
              ? '–'
              : formatPercent(dashboard.totals.fillRate, locale)
          }
        />
        <Kpi
          label={t('kpi.revenue')}
          value={formatPrice(dashboard.totals.revenueMillimes, locale)}
        />
        <Kpi
          label={t('kpi.pending')}
          value={formatPrice(dashboard.totals.pendingMillimes, locale)}
          hint={
            dashboard.totals.pendingOrders > 0 ? String(dashboard.totals.pendingOrders) : undefined
          }
        />
      </dl>

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="events-title">
          <h2 id="events-title" className="mb-3 font-sans text-lg font-semibold">
            {t('events')}
          </h2>
          {events.length === 0 ? (
            <EmptyState
              title={t('noEvents')}
              hint={t('noEventsHint')}
              action={
                <Button asChild className="min-h-11">
                  <Link href="/organizer/events/new">{t('createEvent')}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3" data-testid="organizer-events">
              {events.map((event) => {
                const money = revenue.get(event.id);
                return (
                  <li
                    key={event.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {event.coverUrl ? (
                          <Image
                            src={event.coverUrl}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <CalendarDays
                            className="m-auto mt-5 size-6 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{event.title || '—'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatEventDateTime(event.startsAt, locale)}
                          {event.city ? ` · ${event.city}` : ''}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <StatusBadge status={event.status} />
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Ticket className="size-3.5" aria-hidden="true" />
                            {event.capacity
                              ? t('places', { taken: event.placesTaken, capacity: event.capacity })
                              : t('placesUnlimited', { taken: event.placesTaken })}
                          </span>
                          {money && money.revenueMillimes > 0 ? (
                            <span className="text-muted-foreground">
                              {formatPrice(money.revenueMillimes, locale)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button asChild variant="outline" size="sm" className="min-h-11 rounded-full">
                        <Link href={`/organizer/events/${event.id}/edit`}>{t('edit')}</Link>
                      </Button>
                      {event.status !== 'draft' ? (
                        <Button asChild size="sm" className="min-h-11 rounded-full">
                          <Link href={`/organizer/events/${event.id}`}>{t('open')}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="sources-title"
          className="rounded-xl border border-border bg-card p-4"
        >
          <h2 id="sources-title" className="mb-3 font-sans text-base font-semibold">
            {t('sources')}
          </h2>
          {dashboard.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">–</p>
          ) : (
            <SourceBars sources={dashboard.sources} total={totalSources} direct={t('direct')} />
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2 text-2xl font-bold">
        {value}
        {hint ? <span className="text-sm font-normal text-muted-foreground">({hint})</span> : null}
      </dd>
    </div>
  );
}
