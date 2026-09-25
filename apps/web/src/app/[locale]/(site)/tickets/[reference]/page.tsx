import {
  formatDate,
  formatEventDateTime,
  formatPrice,
  formatTime,
  type Locale,
} from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  PartyPopper,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { TicketQR } from '@/components/doulisha/ticket-qr';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/server';

import {
  BookingActions,
  ManualPaymentSteps,
  PayDifferently,
  PayOnlineButton,
  type PayTo,
} from './ticket-actions';

export const metadata: Metadata = { robots: { index: false } };

type Status =
  | 'confirmed'
  | 'awaiting_payment'
  | 'waitlisted'
  | 'offered'
  | 'cancelled'
  | 'expired'
  | 'refunded';

const statusTone: Record<Status, string> = {
  confirmed: 'bg-cat-outdoor-bg text-cat-outdoor-fg',
  awaiting_payment: 'bg-highlight-soft text-highlight',
  waitlisted: 'bg-secondary text-secondary-foreground',
  offered: 'bg-cat-sports-bg text-cat-sports-fg',
  cancelled: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
  refunded: 'bg-muted text-muted-foreground',
};

/**
 * One booking (TKT-04): what to do next for the method the buyer chose, then
 * the tickets with their QR codes, then secondary actions.
 */
export default async function TicketPage({
  params,
  searchParams,
}: PageProps<'/[locale]/tickets/[reference]'>) {
  const locale = await resolveLocale(params);
  const { reference } = await params;
  const justBooked = (await searchParams).booked === '1';
  const order = await (await api()).booking.byReference({ reference }).catch((error: unknown) => {
    if (
      error instanceof TRPCError &&
      (error.code === 'NOT_FOUND' || error.code === 'UNAUTHORIZED' || error.code === 'BAD_REQUEST')
    ) {
      notFound();
    }
    throw error;
  });
  const t = await getTranslations('Tickets');
  const status: Status =
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
  const closed = ['cancelled', 'expired', 'refunded'].includes(status);
  const manual = order.manualMethod as 'd17' | 'bank_transfer' | 'cash' | null;
  const place = [order.event.venueName, order.event.city].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/tickets"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t('title')}
      </Link>

      {justBooked && !closed ? (
        <p
          role="status"
          className="mt-2 flex items-center gap-2 rounded-xl bg-cat-outdoor-bg p-3 font-medium text-cat-outdoor-fg"
          data-testid="booked-banner"
        >
          <PartyPopper className="size-5 shrink-0" aria-hidden="true" />
          {t('bookedTitle')}
        </p>
      ) : null}

      {/* Event header. */}
      <header className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative aspect-[3/1] bg-muted">
          {order.event.coverUrl ? (
            <Image
              src={order.event.coverUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h1 className="text-2xl font-bold sm:text-3xl">{order.event.title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            {formatEventDateTime(order.event.startsAt, locale)}
          </span>
          {place ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {place}
            </span>
          ) : null}
          <span
            className={cn(
              'ms-auto rounded-full px-3 py-1 text-sm font-semibold',
              statusTone[status],
            )}
            data-testid="ticket-status"
            data-status={status}
          >
            {t(`status.${status}`)}
          </span>
        </div>
      </header>

      {/* What to do next: one card, one main action. */}
      {!closed ? (
        <section
          aria-labelledby="next-step"
          className="mt-4 space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5"
        >
          <h2 id="next-step" className="font-sans text-lg font-semibold">
            {nextTitle(t, status, manual, order.dueMillimes)}
          </h2>
          <NextStepBody
            status={status}
            manual={manual}
            order={order}
            payTo={order.payTo as PayTo}
            locale={locale}
            t={t}
          />
          {status === 'awaiting_payment' &&
          manual &&
          manual !== 'cash' &&
          order.proofStatus !== 'pending' ? (
            <PayDifferently
              reference={order.reference}
              current={manual}
              methods={order.paymentMethods}
            />
          ) : null}
        </section>
      ) : order.refund ? (
        <p className="mt-4 rounded-xl bg-muted p-4 text-sm">
          {t(`refund.${order.refund.status}`, {
            amount: formatPrice(order.refund.amountMillimes, locale),
          })}
        </p>
      ) : null}

      {/* Tickets. */}
      {!closed ? (
        <section aria-labelledby="your-tickets" className="mt-6">
          <h2 id="your-tickets" className="mb-3 font-sans text-lg font-semibold">
            {t('yourTickets', { count: order.tickets.length })}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {order.tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="bg-primary px-4 py-3 text-primary-foreground">
                  <p className="truncate text-xs opacity-80">{order.event.title}</p>
                  <p className="truncate font-semibold">{ticket.fullName}</p>
                  {ticket.ticketName ? (
                    <p className="truncate text-xs opacity-80">{ticket.ticketName}</p>
                  ) : null}
                </div>
                {/* Perforation between the stub and the ticket. */}
                <div
                  aria-hidden="true"
                  className="relative h-4 border-b-2 border-dashed border-border"
                >
                  <span className="absolute -start-2 -top-0 size-4 rounded-full bg-background" />
                  <span className="absolute -end-2 -top-0 size-4 rounded-full bg-background" />
                </div>
                <div className="flex flex-col items-center gap-3 p-4 text-center">
                  {ticket.ticketCode ? (
                    <TicketQR
                      code={ticket.ticketCode}
                      reference={ticket.ticketCode}
                      label={t('qrLabel')}
                    />
                  ) : (
                    <p className="flex min-h-40 items-center rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      {t('qrLater')}
                    </p>
                  )}
                  {ticket.meetingPoint && ticket.meetAt ? (
                    <p className="flex items-center gap-1.5 text-sm">
                      <MapPin className="size-4 text-primary" aria-hidden="true" />
                      {t('meetingPoint', {
                        name: ticket.meetingPoint,
                        time: formatTime(ticket.meetAt, locale),
                      })}
                    </p>
                  ) : null}
                  {ticket.checkedInAt ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-success">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      {t('checkedIn')}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-label={t('manageBooking')}
        className="mt-6 space-y-3 border-t border-border pt-4"
      >
        <p className="ltr-nums text-sm text-muted-foreground">
          {t('reference')} · {order.reference}
          {order.totalMillimes > 0
            ? ` · ${formatPrice(order.paidMillimes, locale)} / ${formatPrice(order.totalMillimes, locale)}`
            : ''}
        </p>
        <BookingActions
          reference={order.reference}
          canCancel={order.canCancel}
          refundIfCancelled={order.refundIfCancelled}
          calendar={{
            title: order.event.title,
            start: order.event.startsAt.toISOString(),
            end: order.event.endsAt?.toISOString() ?? null,
            location: [order.event.venueName, order.event.address, order.event.city]
              .filter(Boolean)
              .join(', '),
          }}
          extra={
            <Link
              href={`/events/${order.event.slug}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              {t('viewEvent')}
            </Link>
          }
        />
      </section>
    </div>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations<'Tickets'>>>;
type Order = Awaited<ReturnType<Awaited<ReturnType<typeof api>>['booking']['byReference']>>;

function nextTitle(t: Translate, status: Status, manual: string | null, due: number): string {
  if (status === 'waitlisted') return t('waitlistTitle');
  if (status === 'offered') return t('offerTitle');
  if (status === 'awaiting_payment') return manual === 'cash' ? t('cashTitle') : t('payTitle');
  if (due > 0) return t('balanceTitle');
  return t('goingTitle');
}

function NextStepBody({
  status,
  manual,
  order,
  payTo,
  locale,
  t,
}: {
  status: Status;
  manual: 'd17' | 'bank_transfer' | 'cash' | null;
  order: Order;
  payTo: PayTo;
  locale: Locale;
  t: Translate;
}): ReactNode {
  const due = formatPrice(order.dueMillimes, locale);
  if (status === 'waitlisted') {
    return (
      <p className="text-sm">{t('waitlistPosition', { position: order.waitlistPosition ?? 0 })}</p>
    );
  }
  if (status === 'offered') {
    return (
      <>
        {order.offerExpiresAt ? (
          <p className="text-sm">
            {t('offerUntil', { time: formatEventDateTime(order.offerExpiresAt, locale) })}
          </p>
        ) : null}
        <PayOnlineButton reference={order.reference} amount={order.dueMillimes} />
      </>
    );
  }
  if (status === 'awaiting_payment' && (manual === 'd17' || manual === 'bank_transfer')) {
    return (
      <ManualPaymentSteps
        reference={order.reference}
        method={manual}
        amount={order.dueMillimes}
        payTo={payTo}
        organizerName={order.organizer?.name ?? null}
        proofStatus={order.proofStatus as 'pending' | 'approved' | 'rejected' | null}
      />
    );
  }
  if (status === 'awaiting_payment' && manual === 'cash') {
    return (
      <p className="flex items-center gap-2 text-sm">
        <Banknote className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {t('manual.cash', { amount: due })}
      </p>
    );
  }
  if (status === 'awaiting_payment') {
    return (
      <>
        {order.holdExpiresAt ? (
          <p className="flex items-center gap-2 text-sm">
            <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t('holdUntil', { time: formatTime(order.holdExpiresAt, locale) })}
          </p>
        ) : null}
        <PayOnlineButton reference={order.reference} amount={order.dueMillimes} />
      </>
    );
  }
  if (order.dueMillimes > 0) {
    return (
      <>
        {order.balanceDueAt ? (
          <p className="text-sm">
            {t('balanceDue', { amount: due, date: formatDate(order.balanceDueAt, locale) })}
          </p>
        ) : null}
        {order.paymentMethods.includes('online') ? (
          <PayOnlineButton reference={order.reference} amount={order.dueMillimes} />
        ) : null}
      </>
    );
  }
  return <p className="text-sm">{t('goingHint')}</p>;
}
