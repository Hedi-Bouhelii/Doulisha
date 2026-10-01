import { formatPrice, formatTime, type Locale } from '@doulisha/i18n';
import { ChevronRight, Ticket } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { EmptyState } from '@/components/doulisha/empty-state';
import { PageHeader } from '@/components/doulisha/page';
import { toneOf } from '@/components/doulisha/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export const metadata: Metadata = { robots: { index: false } };

/** Order status → ticket status label (its tone comes from the one status palette). */
const STATUS: Record<
  string,
  'confirmed' | 'awaiting_payment' | 'waitlisted' | 'cancelled' | 'expired' | 'refunded'
> = {
  paid: 'confirmed',
  partially_paid: 'confirmed',
  awaiting_payment: 'awaiting_payment',
  pending: 'waitlisted',
  cancelled: 'cancelled',
  expired: 'expired',
  refunded: 'refunded',
};

const dayFormat = (locale: Locale) =>
  new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-TN-u-nu-latn' : locale === 'fr' ? 'fr-TN' : 'en-GB',
    {
      timeZone: 'Africa/Tunis',
      day: 'numeric',
    },
  );
const monthFormat = (locale: Locale) =>
  new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-TN-u-nu-latn' : locale === 'fr' ? 'fr-TN' : 'en-GB',
    {
      timeZone: 'Africa/Tunis',
      month: 'short',
    },
  );

/** "My tickets": the member's or guest's bookings, upcoming first, past in their own tab. */
export default async function TicketsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/tickets'>) {
  const locale = await resolveLocale(params);
  const tab = (await searchParams).tab === 'past' ? 'past' : 'upcoming';
  const t = await getTranslations('Tickets');
  const session = await getSession();
  if (!session) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <EmptyState
          icon={Ticket}
          title={t('title')}
          hint={t('signIn')}
          action={
            <Button asChild>
              <Link href="/sign-in?next=/tickets">{t('signInButton')}</Link>
            </Button>
          }
        />
      </div>
    );
  }
  const orders = await (await api()).booking.mine();
  const { upcoming, past } = splitByDate(orders);
  const list = tab === 'past' ? past : upcoming;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title={t('title')} />
      <nav
        aria-label={t('title')}
        className="mt-6 flex gap-1 rounded-full border border-border/60 bg-muted p-1"
      >
        {(['upcoming', 'past'] as const).map((name) => (
          <Link
            key={name}
            href={name === 'past' ? '/tickets?tab=past' : '/tickets'}
            aria-current={tab === name ? 'page' : undefined}
            className={cn(
              'flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors',
              tab === name
                ? 'bg-card font-semibold text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(name)}
            <span
              className={cn(
                'ltr-nums min-w-6 rounded-full px-1.5 text-xs leading-5',
                tab === name ? 'bg-primary-soft text-primary' : 'bg-background/70',
              )}
            >
              {name === 'past' ? past.length : upcoming.length}
            </span>
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Ticket}
          title={tab === 'past' ? t('noPast') : t('empty')}
          hint={t('emptyHint')}
          action={
            <Button asChild>
              <Link href="/explore">{t('findEvents')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 space-y-3" data-testid="my-orders">
          {list.map((order) => {
            const status = STATUS[order.status];
            const due = order.totalMillimes - order.paidMillimes;
            return (
              <li key={order.reference}>
                <Link
                  href={`/tickets/${order.reference}`}
                  className="group flex items-stretch overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-raised"
                >
                  {/* Ticket stub: the date, then a perforation. */}
                  <div
                    className={cn(
                      'flex w-16 shrink-0 flex-col items-center justify-center py-3 text-center sm:w-20',
                      tab === 'past'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary-soft text-primary',
                    )}
                  >
                    <span className="ltr-nums text-2xl leading-none font-bold">
                      {dayFormat(locale).format(order.event.startsAt)}
                    </span>
                    <span className="mt-1 text-xs font-semibold uppercase">
                      {monthFormat(locale).format(order.event.startsAt)}
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className="relative w-0 border-s-2 border-dashed border-border/80"
                  >
                    <span className="absolute -top-2 -start-[9px] size-4 rounded-full border border-border/70 bg-background" />
                    <span className="absolute -bottom-2 -start-[9px] size-4 rounded-full border border-border/70 bg-background" />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-3 sm:gap-4 sm:p-4">
                    <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-xl bg-muted sm:flex sm:items-center sm:justify-center">
                      {order.event.coverUrl ? (
                        <Image
                          src={order.event.coverUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className={cn('object-cover', tab === 'past' && 'grayscale-[0.4]')}
                        />
                      ) : (
                        <Ticket className="size-6 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p dir="auto" className="truncate text-start font-semibold">
                        {order.event.title}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {formatTime(order.event.startsAt, locale)}
                        {order.event.city ? ` · ${order.event.city}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {status ? (
                          <Badge variant={toneOf(status)} dot>
                            {t(`status.${status}`)}
                          </Badge>
                        ) : null}
                        {due > 0 &&
                        ['awaiting_payment', 'partially_paid'].includes(order.status) ? (
                          <span className="ltr-nums text-xs font-semibold text-warning">
                            {t('amountDue', { amount: formatPrice(due, locale) })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Upcoming soonest first, past as returned (latest first). */
function splitByDate<T extends { event: { startsAt: Date } }>(orders: T[], now = new Date()) {
  return {
    upcoming: orders
      .filter((o) => o.event.startsAt >= now)
      .sort((a, b) => a.event.startsAt.getTime() - b.event.startsAt.getTime()),
    past: orders.filter((o) => o.event.startsAt < now),
  };
}
