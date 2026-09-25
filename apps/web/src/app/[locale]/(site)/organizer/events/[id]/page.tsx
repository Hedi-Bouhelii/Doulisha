import { formatEventDateTime } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { ExternalLink, FileSpreadsheet, Pencil, Printer, ScanLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ShareBar } from '@/components/doulisha/share-bar';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { absoluteUrl } from '@/lib/site';
import { api } from '@/trpc/server';

import { SourceBars } from '../../source-bars';
import { StatusBadge } from '../../status-badge';
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{event.title}</h1>
            <StatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {formatEventDateTime(event.startsAt, locale)}
            {event.city ? ` · ${event.city}` : ''}
          </p>
          <p className="mt-1 text-sm">
            {event.capacity
              ? t('places', { taken: event.placesTaken, capacity: event.capacity })
              : t('placesUnlimited', { taken: event.placesTaken })}{' '}
            · <span data-testid="present-count">{t('present', { count: present })}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {shareable ? (
            <Button asChild variant="outline" className="min-h-11 rounded-full">
              <Link href={`/events/${event.slug}`}>
                <ExternalLink aria-hidden="true" />
                {t('view')}
              </Link>
            </Button>
          ) : null}
          {!locked ? (
            <Button asChild variant="outline" className="min-h-11 rounded-full">
              <Link href={`/organizer/events/${event.id}/edit`}>
                <Pencil aria-hidden="true" />
                {t('edit')}
              </Link>
            </Button>
          ) : null}
          <Button asChild className="min-h-11 rounded-full">
            <Link href={`/organizer/events/${event.id}/check-in`} data-testid="open-check-in">
              <ScanLine aria-hidden="true" />
              {t('checkIn')}
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{t('export')}:</span>
        <Button asChild variant="secondary" size="sm" className="min-h-11 rounded-full">
          <a href={`/api/organizer/events/${event.id}/export?locale=${locale}`} download>
            <FileSpreadsheet aria-hidden="true" />
            {t('exportExcel')}
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm" className="min-h-11 rounded-full">
          <Link href={`/organizer/events/${event.id}/print`}>
            <Printer aria-hidden="true" />
            {t('exportPdf')}
          </Link>
        </Button>
        <EventActions eventId={event.id} canCancel={!locked && event.status !== 'draft'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        <ManagePanel
          eventId={event.id}
          attendees={attendees}
          tickets={data.tickets
            .filter((ticket) => ticket.isActive)
            .map((ticket) => ({ id: ticket.id, name: ticket.name }))}
          questions={Object.fromEntries(data.questions.map((q) => [q.id, q.label]))}
          locked={locked}
        />
        <aside className="space-y-6">
          <section
            aria-labelledby="sources-title"
            className="rounded-xl border border-border bg-card p-4"
          >
            <h2 id="sources-title" className="mb-3 font-sans text-base font-semibold">
              {t('sources')}
            </h2>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">–</p>
            ) : (
              <SourceBars
                sources={sources}
                total={sources.reduce((sum, s) => sum + s.orders, 0)}
                direct={t('direct')}
              />
            )}
          </section>
          {shareable ? (
            <section className="rounded-xl border border-border bg-card p-4">
              <ShareBar
                url={absoluteUrl(`/${locale}/events/${event.slug}`)}
                message={tShare('message', {
                  title: event.title,
                  date: formatEventDateTime(event.startsAt, locale),
                })}
                imageBase={`/api/og/event?slug=${encodeURIComponent(event.slug)}&locale=${locale}`}
              />
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
