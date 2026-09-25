import { formatDate, formatEventDateTime, formatPrice, formatTime } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { CheckCircle2, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { TicketQR } from '@/components/doulisha/ticket-qr';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/server';

import { TicketActions } from './ticket-actions';

export const metadata: Metadata = { robots: { index: false } };

const paymentClasses: Record<string, string> = {
  paid: 'bg-cat-outdoor-bg text-cat-outdoor-fg',
  deposit: 'bg-cat-sports-bg text-cat-sports-fg',
  pending: 'bg-highlight-soft text-highlight',
  refunded: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  waitlisted: 'bg-secondary text-secondary-foreground',
};

/** One booking: status, QR tickets (TKT-04), what is due and what the buyer can do. */
export default async function TicketPage({ params }: PageProps<'/[locale]/tickets/[reference]'>) {
  const locale = await resolveLocale(params);
  const { reference } = await params;
  const order = await (await api()).booking.byReference({ reference }).catch((error: unknown) => {
    if (error instanceof TRPCError && (error.code === 'NOT_FOUND' || error.code === 'UNAUTHORIZED' || error.code === 'BAD_REQUEST')) {
      notFound();
    }
    throw error;
  });
  const t = await getTranslations('Tickets');
  const status =
    order.bookingStatus === 'offered'
      ? 'offered'
      : order.bookingStatus === 'waitlisted'
        ? 'waitlisted'
        : order.orderStatus === 'refunded'
          ? 'refunded'
          : ['cancelled', 'expired'].includes(order.orderStatus)
            ? (order.orderStatus as 'cancelled' | 'expired')
            : order.dueMillimes > 0 && order.payment === 'pending'
              ? 'awaiting_payment'
              : 'confirmed';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <p className="ltr-nums text-sm text-muted-foreground">
        {t('reference')} · {order.reference}
      </p>
      <h1 className="mt-1 text-3xl font-bold">{order.event.title}</h1>
      <p className="mt-1 text-muted-foreground">
        {[order.event.venueName, order.event.city].filter(Boolean).join(' · ')} ·{' '}
        {formatEventDateTime(order.event.startsAt, locale)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground" data-testid="ticket-status">
          {t(`status.${status}`)}
        </span>
        <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', paymentClasses[order.payment])}>
          {t(`payment.${order.payment}`)}
        </span>
        {order.totalMillimes > 0 ? (
          <span className="text-sm text-muted-foreground">
            {formatPrice(order.paidMillimes, locale)} / {formatPrice(order.totalMillimes, locale)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {order.holdExpiresAt ? <p>{t('holdUntil', { time: formatTime(order.holdExpiresAt, locale) })}</p> : null}
        {order.offerExpiresAt ? (
          <p className="font-medium text-highlight">
            {t('offerUntil', { time: formatEventDateTime(order.offerExpiresAt, locale) })}
          </p>
        ) : null}
        {order.waitlistPosition ? <p>{t('waitlistPosition', { position: order.waitlistPosition })}</p> : null}
        {order.balanceDueAt && order.dueMillimes > 0 && order.paidMillimes > 0 ? (
          <p>
            {t('balanceDue', {
              amount: formatPrice(order.dueMillimes, locale),
              date: formatDate(order.balanceDueAt, locale),
            })}
          </p>
        ) : null}
        {order.manualMethod && order.dueMillimes > 0 && status !== 'cancelled' ? (
          <p>{t(`manual.${order.manualMethod as 'd17' | 'bank_transfer' | 'cash'}`, { amount: formatPrice(order.dueMillimes, locale) })}</p>
        ) : null}
        {order.proofStatus ? <p>{t(`proof.${order.proofStatus}`)}</p> : null}
        {order.refund ? (
          <p>{t(`refund.${order.refund.status}`, { amount: formatPrice(order.refund.amountMillimes, locale) })}</p>
        ) : null}
      </div>

      <TicketActions
        reference={order.reference}
        dueMillimes={order.dueMillimes}
        canPayOnline={['awaiting_payment', 'offered'].includes(status) || (status === 'confirmed' && order.dueMillimes > 0)}
        canUploadProof={Boolean(order.manualMethod && order.manualMethod !== 'cash' && order.dueMillimes > 0 && order.proofStatus !== 'pending')}
        canCancel={order.canCancel}
        refundIfCancelled={order.refundIfCancelled}
        calendar={{
          title: order.event.title,
          start: order.event.startsAt.toISOString(),
          end: order.event.endsAt?.toISOString() ?? null,
          location: [order.event.venueName, order.event.address, order.event.city].filter(Boolean).join(', '),
        }}
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {order.tickets.map((ticket) => (
          <li key={ticket.id} className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 text-center">
            <p className="font-semibold">{t('ticketFor', { name: ticket.fullName })}</p>
            {ticket.ticketName ? <p className="-mt-2 text-sm text-muted-foreground">{ticket.ticketName}</p> : null}
            {ticket.ticketCode ? (
              <TicketQR code={ticket.ticketCode} reference={ticket.ticketCode} label={t('qrLabel')} />
            ) : (
              <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">{t('qrLater')}</p>
            )}
            {ticket.meetingPoint && ticket.meetAt ? (
              <p className="flex items-center gap-1.5 text-sm">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                {t('meetingPoint', { name: ticket.meetingPoint, time: formatTime(ticket.meetAt, locale) })}
              </p>
            ) : null}
            {ticket.checkedInAt ? (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {t('checkedIn')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-8">
        <Link href={`/events/${order.event.slug}`} className="text-sm font-semibold text-primary hover:underline">
          {t('viewEvent')}
        </Link>
      </p>
    </div>
  );
}
