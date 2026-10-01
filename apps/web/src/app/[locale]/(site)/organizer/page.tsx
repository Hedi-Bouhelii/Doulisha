import { formatEventDateTime, formatPercent, formatPrice } from '@doulisha/i18n';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  FileSearch,
  Gauge,
  Hourglass,
  Ticket,
  Wallet,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { EmptyState } from '@/components/doulisha/empty-state';
import { PageHeader, StatCard } from '@/components/doulisha/page';
import { StatusBadge } from '@/components/doulisha/status-badge';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { api } from '@/trpc/server';

import { SourceBars } from './source-bars';

/** ORG-01 dashboard: key figures, booking sources and every event the member manages. */
export default async function OrganizerDashboardPage({ params }: PageProps<'/[locale]/organizer'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations('Organizer');
  const caller = await api();
  const [dashboard, events, toVerify] = await Promise.all([
    caller.organizer.dashboard(),
    caller.editor.myEvents(),
    caller.organizer.receiptsToVerify(),
  ]);
  const tPayments = await getTranslations('Payments');
  const revenue = new Map(dashboard.events.map((e) => [e.id, e]));
  const totalSources = dashboard.sources.reduce((sum, s) => sum + s.orders, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('dashboard')}
        actions={
          <Button asChild>
            <Link href="/organizer/events/new" data-testid="create-event">
              <CalendarPlus aria-hidden="true" />
              {t('createEvent')}
            </Link>
          </Button>
        }
      />

      {toVerify > 0 ? (
        <Link
          href="/organizer/payments"
          className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-highlight/25 bg-highlight-soft p-4 text-highlight transition-shadow hover:shadow-card sm:px-5"
          data-testid="receipts-banner"
        >
          <span className="flex items-center gap-3 font-semibold">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card/70">
              <FileSearch className="size-5" aria-hidden="true" />
            </span>
            {tPayments('toVerifyBanner', { count: toVerify })}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {tPayments('verifyNow')}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label={t('kpi.upcoming')}
          value={dashboard.totals.upcomingEvents}
        />
        <StatCard
          icon={Gauge}
          tone="info"
          label={t('kpi.fillRate')}
          value={
            dashboard.totals.fillRate === null
              ? '–'
              : formatPercent(dashboard.totals.fillRate, locale)
          }
        />
        <StatCard
          icon={Wallet}
          tone="accent"
          label={t('kpi.revenue')}
          value={formatPrice(dashboard.totals.revenueMillimes, locale)}
        />
        <StatCard
          icon={Hourglass}
          tone="warning"
          label={t('kpi.pending')}
          value={formatPrice(dashboard.totals.pendingMillimes, locale)}
          hint={
            dashboard.totals.pendingOrders > 0
              ? t('kpi.pendingOrders', { count: dashboard.totals.pendingOrders })
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="events-title">
          <h2 id="events-title" className="mb-4 font-sans text-xl font-semibold tracking-tight">
            {t('events')}
          </h2>
          {events.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title={t('noEvents')}
              hint={t('noEventsHint')}
              action={
                <Button asChild>
                  <Link href="/organizer/events/new">{t('createEvent')}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3" data-testid="organizer-events">
              {events.map((event) => {
                const money = revenue.get(event.id);
                const fill = event.capacity
                  ? Math.min(1, event.placesTaken / event.capacity)
                  : null;
                return (
                  <li
                    key={event.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-shadow hover:shadow-raised sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="relative flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-soft">
                        {event.coverUrl ? (
                          <Image
                            src={event.coverUrl}
                            alt=""
                            fill
                            sizes="72px"
                            className="object-cover"
                          />
                        ) : (
                          <CalendarDays className="size-6 text-primary" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold" dir="auto">
                            {event.title || '—'}
                          </p>
                          <StatusBadge status={event.status} />
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {formatEventDateTime(event.startsAt, locale)}
                          {event.city ? ` · ${event.city}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Ticket className="size-3.5" aria-hidden="true" />
                            <span className="ltr-nums">
                              {event.capacity
                                ? t('places', {
                                    taken: event.placesTaken,
                                    capacity: event.capacity,
                                  })
                                : t('placesUnlimited', { taken: event.placesTaken })}
                            </span>
                          </span>
                          {fill !== null ? (
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"
                            >
                              <span
                                className="block h-full rounded-full bg-primary"
                                style={{ width: `${Math.round(fill * 100)}%` }}
                              />
                            </span>
                          ) : null}
                          {money && money.revenueMillimes > 0 ? (
                            <span className="ltr-nums inline-flex items-center gap-1.5 font-medium text-foreground">
                              <Wallet
                                className="size-3.5 text-muted-foreground"
                                aria-hidden="true"
                              />
                              {formatPrice(money.revenueMillimes, locale)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button asChild variant="outline" className="flex-1 sm:flex-none">
                        <Link href={`/organizer/events/${event.id}/edit`}>{t('edit')}</Link>
                      </Button>
                      {event.status !== 'draft' ? (
                        <Button asChild className="flex-1 sm:flex-none">
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

        <aside>
          <section
            aria-labelledby="sources-title"
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-card lg:sticky lg:top-24"
          >
            <h2
              id="sources-title"
              className="mb-4 flex items-center gap-2 font-sans text-base font-semibold"
            >
              <BarChart3 className="size-5 text-primary" aria-hidden="true" />
              {t('sources')}
            </h2>
            {dashboard.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noSources')}</p>
            ) : (
              <SourceBars sources={dashboard.sources} total={totalSources} direct={t('direct')} />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
