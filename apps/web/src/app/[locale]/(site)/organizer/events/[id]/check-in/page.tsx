import { TRPCError } from '@trpc/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { api } from '@/trpc/server';

import { Scanner } from './scanner';

/** TKT-05: check people in at the door, by QR code or ticket code. */
export default async function CheckInPage({
  params,
}: PageProps<'/[locale]/organizer/events/[id]/check-in'>) {
  await resolveLocale(params);
  const { id } = await params;
  const caller = await api();
  const attendees = await caller.organizer.attendees({ eventId: id }).catch((error: unknown) => {
    if (
      error instanceof TRPCError &&
      ['NOT_FOUND', 'FORBIDDEN', 'BAD_REQUEST'].includes(error.code)
    ) {
      notFound();
    }
    throw error;
  });
  const { event } = await caller.editor.get({ eventId: id });
  const t = await getTranslations('Organizer');
  const confirmed = attendees.filter((a) => a.ticketCode && a.bookingStatus === 'confirmed');

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        href={`/organizer/events/${id}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        {event.title}
      </Link>
      <h1 className="text-2xl font-bold">{t('checkInTitle', { title: event.title })}</h1>
      <Scanner
        eventId={id}
        initialPresent={confirmed.filter((a) => a.checkedInAt).length}
        total={confirmed.length}
      />
    </div>
  );
}
