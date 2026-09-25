import { isLocale, MILLIMES_PER_DINAR, TIME_ZONE, toTunisInput, type Locale } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import ExcelJS from 'exceljs';
import { getTranslations } from 'next-intl/server';

import { apiForLocale } from '@/trpc/server';

const statusByTrpcCode: Partial<Record<TRPCError['code'], number>> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 404,
  NOT_FOUND: 404,
  BAD_REQUEST: 404,
};

/**
 * PRT-05 attendee list as an Excel file, one row per person, one column per
 * booking question. Organizers of the event only (checked by the service).
 * GET /api/organizer/events/{id}/export?locale=fr
 */
export async function GET(
  request: Request,
  { params }: RouteContext<'/api/organizer/events/[id]/export'>,
) {
  const { id } = await params;
  const localeParam = new URL(request.url).searchParams.get('locale') ?? 'fr';
  const locale: Locale = isLocale(localeParam) ? localeParam : 'fr';
  const caller = await apiForLocale(locale);

  let data;
  let attendees;
  try {
    data = await caller.editor.get({ eventId: id });
    attendees = await caller.organizer.attendees({ eventId: id });
  } catch (error) {
    if (error instanceof TRPCError) {
      return new Response(null, { status: statusByTrpcCode[error.code] ?? 500 });
    }
    throw error;
  }

  const t = await getTranslations({ locale, namespace: 'Organizer' });
  const tTickets = await getTranslations({ locale, namespace: 'Tickets' });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Doulisha';
  const sheet = workbook.addWorksheet(t('attendees'), {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: locale === 'ar' }],
  });
  sheet.columns = [
    { header: t('columns.name'), key: 'name', width: 28 },
    { header: 'Tel', key: 'phone', width: 16 },
    { header: 'Email', key: 'email', width: 26 },
    { header: t('columns.ticket'), key: 'ticket', width: 18 },
    { header: t('columns.meetingPoint'), key: 'meetingPoint', width: 20 },
    { header: t('columns.payment'), key: 'payment', width: 16 },
    { header: `${t('columns.payment')} (DT)`, key: 'paid', width: 12, style: { numFmt: '0.000' } },
    { header: `${t('kpi.pending')} (DT)`, key: 'due', width: 12, style: { numFmt: '0.000' } },
    { header: t('columns.reference'), key: 'reference', width: 14 },
    { header: t('columns.source'), key: 'source', width: 14 },
    ...data.questions.map((q) => ({ header: q.label, key: `q:${q.id}`, width: 22 })),
    { header: `${t('columns.checkIn')} (${TIME_ZONE})`, key: 'checkIn', width: 18 },
    { header: t('note'), key: 'notes', width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const a of attendees) {
    sheet.addRow({
      name: a.fullName,
      phone: a.phone ?? '',
      email: a.email ?? '',
      ticket: a.ticketName ?? '',
      meetingPoint: a.meetingPoint ?? '',
      payment:
        a.payment === 'waitlisted' && a.waitlistPosition
          ? `${tTickets('payment.waitlisted')} ${t('position', { position: a.waitlistPosition })}`
          : tTickets(`payment.${a.payment}`),
      paid: a.paidMillimes / MILLIMES_PER_DINAR,
      due: Math.max(0, a.totalMillimes - a.paidMillimes) / MILLIMES_PER_DINAR,
      reference: a.reference,
      source: a.utmSource ?? t('direct'),
      ...Object.fromEntries(
        data.questions.map((q) => [`q:${q.id}`, String(a.answers[q.id] ?? '')]),
      ),
      checkIn: a.checkedInAt ? toTunisInput(a.checkedInAt).replace('T', ' ') : '',
      notes: a.notes ?? '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `doulisha-${data.event.slug}-${t('attendees')}.xlsx`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="doulisha-${data.event.slug}.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'cache-control': 'private, no-store',
    },
  });
}
