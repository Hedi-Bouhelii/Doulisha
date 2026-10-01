import {
  formatDate,
  formatEventDateTime,
  formatPrice,
  formatTime,
  type Locale,
} from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileDown,
  Hourglass,
  Info,
  MapPin,
  PartyPopper,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { HillsBackdrop } from '@/components/doulisha/decor';
import { BackLink } from '@/components/doulisha/page';
import { toneOf } from '@/components/doulisha/status-badge';
import { TicketQR } from '@/components/doulisha/ticket-qr';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

import {
  BookingActions,
  ManualPaymentSteps,
  PayDifferently,
  PayOnlineButton,
  type PayTo,
  PdfTicketButton,
} from './ticket-actions';

export const metadata: Metadata = { robots: { index: false } };

type Status =
  | 'confirmed'
  | 'reserved'
  | 'awaiting_payment'
  | 'waitlisted'
  | 'offered'
  | 'cancelled'
  | 'expired'
  | 'refunded';

/** The icon of the "what to do next" card, by status. */
const nextIcon: Partial<Record<Status, { icon: LucideIcon; tone: string }>> = {
  confirmed: { icon: CheckCircle2, tone: 'bg-success-soft text-success' },
  reserved: { icon: Clock, tone: 'bg-warning-soft text-warning' },
  awaiting_payment: { icon: Clock, tone: 'bg-warning-soft text-warning' },
  waitlisted: { icon: Hourglass, tone: 'bg-info-soft text-info' },
  offered: { icon: Hourglass, tone: 'bg-info-soft text-info' },
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
  const tReasons = await getTranslations('Payments.reasons');
  const manual = order.manualMethod as 'd17' | 'bank_transfer' | 'cash' | null;
  const status: Status =
    order.bookingStatus === 'expired'
      ? 'expired'
      : order.bookingStatus === 'held' && (manual === 'd17' || manual === 'bank_transfer')
        ? 'reserved'
        : order.bookingStatus === 'offered'
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
  const place = [order.event.venueName, order.event.city].filter(Boolean).join(' · ');
  const session = await getSession();
  const isGuest = !session || session.user.isAnonymous === true;
  const hasQr = !closed && order.tickets.some((ticket) => ticket.ticketCode);
  const next = nextIcon[status] ?? nextIcon.confirmed;
  const NextIcon = next?.icon ?? CheckCircle2;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <BackLink href="/tickets">{t('title')}</BackLink>

      {justBooked && !closed ? (
        <p
          role="status"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-success/15 bg-success-soft px-4 py-3 font-semibold text-success"
          data-testid="booked-banner"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card/70">
            <PartyPopper className="size-5" aria-hidden="true" />
          </span>
          {t('bookedTitle')}
        </p>
      ) : null}

      {/* Event header. */}
      <header className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
        <div
          className={cn(
            'relative aspect-[5/2] sm:aspect-[3/1]',
            order.event.coverUrl ? 'bg-muted' : 'bg-primary',
          )}
        >
          {order.event.coverUrl ? (
            <Image
              src={order.event.coverUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
          ) : (
            <HillsBackdrop className="absolute inset-x-0 bottom-0 h-3/4 opacity-80" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
            <h1
              dir="auto"
              className="font-display text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl"
            >
              {order.event.title}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm sm:px-6">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {formatEventDateTime(order.event.startsAt, locale)}
          </span>
          {place ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{place}</span>
            </span>
          ) : null}
          <Badge
            variant={toneOf(status)}
            dot
            className="ms-auto px-3 py-1 text-sm"
            data-testid="ticket-status"
            data-status={status}
          >
            {t(`status.${status}`)}
          </Badge>
        </div>
      </header>

      {/* What to do next: one card, one main action. */}
      {!closed ? (
        <section
          aria-labelledby="next-step"
          className="mt-5 space-y-4 rounded-3xl border border-primary/15 bg-primary-soft/45 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                next?.tone,
              )}
            >
              <NextIcon className="size-5" aria-hidden="true" />
            </span>
            <h2 id="next-step" className="pt-1.5 font-sans text-lg leading-snug font-semibold">
              {nextTitle(t, status, manual, order.dueMillimes, order.proofStatus)}
            </h2>
          </div>
          <NextStepBody
            status={status}
            manual={manual}
            order={order}
            payTo={order.payTo as PayTo}
            locale={locale}
            t={t}
            tReasons={tReasons}
          />
          {(status === 'reserved' || status === 'awaiting_payment') &&
          manual &&
          order.proofStatus !== 'pending' ? (
            <PayDifferently
              reference={order.reference}
              current={manual}
              methods={order.paymentMethods}
            />
          ) : null}
        </section>
      ) : status === 'expired' ? (
        <p
          className="mt-5 flex items-start gap-3 rounded-2xl bg-muted/70 p-4 text-sm"
          data-testid="expired-hint"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {t('expiredHint')}
        </p>
      ) : order.refund ? (
        <p className="mt-5 flex items-start gap-3 rounded-2xl bg-info-soft p-4 text-sm text-info">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t(`refund.${order.refund.status}`, {
            amount: formatPrice(order.refund.amountMillimes, locale),
          })}
        </p>
      ) : null}

      {/* Guests have no account: the PDF is their ticket (Q23). It downloads once,
          as soon as the places are confirmed (at booking, or when the organizer
          confirms a D17 or transfer payment). */}
      {hasQr && isGuest ? (
        <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5">
          <p className="flex max-w-md items-start gap-3 text-sm">
            <FileDown className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            {t('guestPdfHint')}
          </p>
          <PdfTicketButton reference={order.reference} autoDownload prominent />
        </section>
      ) : null}

      {/* Tickets. */}
      {!closed ? (
        <section aria-labelledby="your-tickets" className="mt-8">
          <h2 id="your-tickets" className="mb-4 font-sans text-xl font-semibold tracking-tight">
            {t('yourTickets', { count: order.tickets.length })}
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2">
            {order.tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card"
              >
                <div className="relative overflow-hidden bg-primary px-5 py-4 text-primary-foreground">
                  <HillsBackdrop className="absolute inset-x-0 bottom-0 h-10 opacity-60" />
                  <p dir="auto" className="relative truncate text-xs opacity-85">
                    {order.event.title}
                  </p>
                  <p className="relative truncate text-lg font-semibold">{ticket.fullName}</p>
                  {ticket.ticketName ? (
                    <p className="relative truncate text-xs opacity-85">{ticket.ticketName}</p>
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
                <div className="flex flex-col items-center gap-3 p-5 text-center">
                  {ticket.ticketCode ? (
                    <TicketQR
                      code={ticket.ticketCode}
                      reference={ticket.ticketCode}
                      label={t('qrLabel')}
                    />
                  ) : (
                    <p
                      className="flex min-h-40 items-center rounded-2xl bg-muted/70 p-4 text-sm text-muted-foreground"
                      data-testid="qr-pending"
                    >
                      {status === 'reserved' ? t('qrAfterPayment') : t('qrLater')}
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
        aria-labelledby="manage-booking"
        className="mt-8 space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="manage-booking" className="font-sans text-base font-semibold">
            {t('manageBooking')}
          </h2>
          <p className="ltr-nums text-sm text-muted-foreground">
            {t('reference')} · <span className="font-mono text-foreground">{order.reference}</span>
            {order.totalMillimes > 0
              ? ` · ${formatPrice(order.paidMillimes, locale)} / ${formatPrice(order.totalMillimes, locale)}`
              : ''}
          </p>
        </div>
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
            <>
              {hasQr && !isGuest ? (
                <PdfTicketButton reference={order.reference} autoDownload={false} />
              ) : null}
              <Link
                href={`/events/${order.event.slug}`}
                className={buttonVariants({ variant: 'outline' })}
              >
                {t('viewEvent')}
              </Link>
            </>
          }
        />
      </section>
    </div>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations<'Tickets'>>>;
type Order = Awaited<ReturnType<Awaited<ReturnType<typeof api>>['booking']['byReference']>>;

function nextTitle(
  t: Translate,
  status: Status,
  manual: string | null,
  due: number,
  proofStatus: string | null,
): string {
  if (status === 'reserved')
    return proofStatus === 'pending' ? t('reviewTitle') : t('reservedTitle');
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
  tReasons,
}: {
  status: Status;
  manual: 'd17' | 'bank_transfer' | 'cash' | null;
  order: Order;
  payTo: PayTo;
  locale: Locale;
  t: Translate;
  tReasons: Awaited<ReturnType<typeof getTranslations<'Payments.reasons'>>>;
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
  if (status === 'reserved' && (manual === 'd17' || manual === 'bank_transfer')) {
    return (
      <>
        {order.paymentDeadline ? (
          <p className="flex items-center gap-2 text-sm font-medium" data-testid="payment-deadline">
            <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t('payBefore', { time: formatEventDateTime(order.paymentDeadline, locale) })}
          </p>
        ) : null}
        {order.proofRejection ? (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive"
            data-testid="proof-rejected"
          >
            <p className="font-semibold">
              {t('rejectedBecause', {
                reason: tReasons((order.proofRejection.reason ?? 'other') as 'other'),
              })}
            </p>
            {order.proofRejection.note ? (
              <p className="mt-1">« {order.proofRejection.note} »</p>
            ) : null}
          </div>
        ) : null}
        <ManualPaymentSteps
          reference={order.reference}
          method={manual}
          amount={order.dueMillimes}
          payTo={payTo}
          organizerName={order.organizer?.name ?? null}
          proofStatus={order.proofStatus as 'pending' | 'approved' | 'rejected' | null}
        />
      </>
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
