import { formatEventDateTime, formatPrice } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

import { PrintButton } from './print-button';

/**
 * PRT-05 attendee list for printing or "Save as PDF" (ADR 0014): the browser
 * prints the page, so Arabic and RTL come out exactly as on screen.
 */
export default async function PrintAttendeesPage({
  params,
}: PageProps<'/[locale]/organizer/events/[id]/print'>) {
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
  const attendees = (await caller.organizer.attendees({ eventId: id })).filter(
    (a) => a.payment !== 'waitlisted' && a.payment !== 'cancelled' && a.payment !== 'refunded',
  );
  const t = await getTranslations('Organizer');
  const tTickets = await getTranslations('Tickets');
  const questions = new Map(data.questions.map((q) => [q.id, q.label]));

  return (
    <div className="space-y-4 print:text-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold print:text-lg">
            {t('printTitle', { title: data.event.title })}
          </h1>
          <p className="text-muted-foreground">
            {formatEventDateTime(data.event.startsAt, locale)}
            {data.event.city ? ` · ${data.event.city}` : ''} · {attendees.length}
          </p>
        </div>
        <PrintButton label={t('print')} />
      </div>
      <table className="w-full border-collapse text-sm print:text-[11px]">
        <thead>
          <tr className="border-b-2 border-foreground text-start">
            <th className="p-2 text-start">#</th>
            <th className="p-2 text-start">{t('columns.name')}</th>
            <th className="p-2 text-start">{t('columns.ticket')}</th>
            <th className="p-2 text-start">{t('columns.meetingPoint')}</th>
            <th className="p-2 text-start">{t('columns.payment')}</th>
            <th className="p-2 text-start">{t('columns.answers')}</th>
            <th className="p-2 text-start">{t('columns.checkIn')}</th>
          </tr>
        </thead>
        <tbody>
          {attendees.map((a, index) => (
            <tr key={a.id} className="border-b border-border break-inside-avoid">
              <td className="ltr-nums p-2 align-top">{index + 1}</td>
              <td className="p-2 align-top">
                <span className="font-medium">{a.fullName}</span>
                <br />
                <span className="ltr-nums text-muted-foreground">{a.phone ?? ''}</span>
              </td>
              <td className="p-2 align-top">{a.ticketName}</td>
              <td className="p-2 align-top">{a.meetingPoint}</td>
              <td className="p-2 align-top">
                {tTickets(`payment.${a.payment}`)}
                {a.totalMillimes > a.paidMillimes ? (
                  <span className="block text-muted-foreground">
                    {formatPrice(a.totalMillimes - a.paidMillimes, locale)}
                  </span>
                ) : null}
              </td>
              <td className="p-2 align-top">
                {Object.entries(a.answers)
                  .map(([qid, answer]) => `${questions.get(qid) ?? qid}: ${String(answer)}`)
                  .join(' · ')}
              </td>
              <td className="p-2 align-top">
                <span
                  aria-hidden="true"
                  className="inline-block size-4 border border-foreground align-middle"
                >
                  {a.checkedInAt ? '✓' : ''}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
