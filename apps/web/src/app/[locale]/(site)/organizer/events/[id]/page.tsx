import { formatEventDateTime, formatPercent } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Pencil,
  ScanLine,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { HillsBackdrop, LeafSprig } from '@/components/doulisha/decor';
import { BackLink } from '@/components/doulisha/page';
import { ShareBar } from '@/components/doulisha/share-bar';
import { StatusBadge } from '@/components/doulisha/status-badge';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { absoluteUrl } from '@/lib/site';
import { api } from '@/trpc/server';

import { SourceBars } from '../../source-bars';
import { EventActions } from './event-actions';
import { ManagePanel } from './manage-panel';

/** PRT-01..04: one event's attendees, payments, waitlist, refunds and sources. */
export default async function ManageEventPage({
  params,
}: PageProps<'/[locale]/organizer/events/[id]'>) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const caller = await api();
  const data = await caller.editor.get({ eventId: id }).catch((error: unknown) => {
    if (
      error instanceof TRPCError &&
      ['NOT_FOUND', 'FORBIDDEN', 'BAD_REQUEST'].includes(error.code)
    ) {
      notFound();
    }
    throw error;
  });
  // The inbox releases reservations past their deadline first, so the lists below are current.
  const inbox = await caller.organizer.payments({ eventId: id });
  const [attendees, sources] = await Promise.all([
    caller.organizer.attendees({ eventId: id }),
    caller.organizer.sources({ eventId: id }),
  ]);
  const t = await getTranslations('Organizer');
  const tShare = await getTranslations('Share');
  const { event } = data;
  const present = attendees.filter((a) => a.checkedInAt).length;
  const shareable = event.status !== 'draft' && event.visibility !== 'private';
  const locked = event.status === 'cancelled' || event.status === 'completed';
  const fill = event.capacity ? Math.min(1, event.placesTaken / event.capacity) : null;

  return (
    <div className="space-y-8">
      <div>
        <BackLink href="/organizer">{t('events')}</BackLink>
        <header className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-primary-soft shadow-card sm:aspect-[5/2] lg:aspect-[4/3] lg:w-52">
            {event.coverUrl ? (
              <Image
                src={event.coverUrl}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 208px, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <CalendarDays className="size-9 text-primary" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1
                  dir="auto"
                  className="font-display text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl"
                >
                  {event.title}
                </h1>
                <StatusBadge status={event.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {formatEventDateTime(event.startsAt, locale)}
                </span>
                {event.city ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    {event.city}
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
              <MiniStat
                icon={Users}
                label={t('stats.capacity')}
                value={
                  event.capacity ?? (
                    <>
                      <span aria-hidden="true">∞</span>
                      <span className="sr-only">{t('stats.unlimited')}</span>
                    </>
                  )
                }
              />
              <MiniStat icon={Ticket} label={t('stats.booked')} value={event.placesTaken} />
              <MiniStat
                icon={CheckCircle2}
                label={t('stats.checkedIn')}
                value={present}
                testId="present-count"
              />
            </dl>

            {event.capacity && fill !== null ? (
              <div className="sm:max-w-xl">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span className="ltr-nums">
                    {t('places', { taken: event.placesTaken, capacity: event.capacity })}
                  </span>
                  <span className="ltr-nums">{formatPercent(fill, locale)}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t('kpi.fillRate')}
                  aria-valuemin={0}
                  aria-valuemax={event.capacity}
                  aria-valuenow={event.placesTaken}
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${Math.max(fill > 0 ? 3 : 0, Math.round(fill * 100))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:col-span-2 xl:col-span-1 xl:flex-nowrap xl:justify-end">
            {shareable ? (
              <Button asChild variant="outline">
                <Link href={`/events/${event.slug}`}>
                  <ExternalLink aria-hidden="true" />
                  {t('view')}
                </Link>
              </Button>
            ) : null}
            {!locked ? (
              <Button asChild variant="outline">
                <Link href={`/organizer/events/${event.id}/edit`}>
                  <Pencil aria-hidden="true" />
                  {t('edit')}
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/organizer/events/${event.id}/check-in`} data-testid="open-check-in">
                <ScanLine aria-hidden="true" />
                {t('checkIn')}
              </Link>
            </Button>
            <EventActions
              eventId={event.id}
              canCancel={!locked && event.status !== 'draft'}
              exportHref={`/api/organizer/events/${event.id}/export?locale=${locale}`}
              printHref={`/organizer/events/${event.id}/print`}
            />
          </div>
        </header>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ManagePanel
          eventId={event.id}
          attendees={attendees}
          tickets={data.tickets
            .filter((ticket) => ticket.isActive)
            .map((ticket) => ({ id: ticket.id, name: ticket.name }))}
          questions={Object.fromEntries(data.questions.map((q) => [q.id, q.label]))}
          locked={locked}
          inbox={inbox}
        />
        <aside className="space-y-5">
          <section
            aria-labelledby="sources-title"
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-card"
          >
            <h2
              id="sources-title"
              className="mb-4 flex items-center gap-2 font-sans text-base font-semibold"
            >
              <BarChart3 className="size-5 text-primary" aria-hidden="true" />
              {t('sources')}
            </h2>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noSources')}</p>
            ) : (
              <SourceBars
                sources={sources}
                total={sources.reduce((sum, s) => sum + s.orders, 0)}
                direct={t('direct')}
              />
            )}
          </section>
          {shareable ? (
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
              <ShareBar
                url={absoluteUrl(`/${locale}/events/${event.slug}`)}
                message={tShare('message', {
                  title: event.title,
                  date: formatEventDateTime(event.startsAt, locale),
                })}
                imageBase={`/api/og/event?slug=${encodeURIComponent(event.slug)}&locale=${locale}`}
              />
            </div>
          ) : null}
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-secondary/60 p-5 ps-24">
            <LeafSprig className="absolute start-3 bottom-0 h-24 w-auto" />
            <HillsBackdrop className="absolute inset-x-0 bottom-0 h-12 opacity-70" />
            <p className="relative font-display text-base leading-snug font-semibold text-primary">
              {t('thanksTitle')}
            </p>
            <p className="relative mt-1 text-xs text-muted-foreground">{t('thanksHint')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** A small key figure in the event header (places, booked, present). */
function MiniStat({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="min-w-0 rounded-2xl border border-border/70 bg-card px-3 py-3 shadow-xs sm:px-4"
      data-testid={testId}
    >
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="ltr-nums mt-1 text-2xl leading-tight font-bold tracking-tight">{value}</dd>
    </div>
  );
}
