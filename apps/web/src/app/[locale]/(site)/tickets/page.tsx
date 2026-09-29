import { formatPrice, formatTime, type Locale } from '@doulisha/i18n';
import { ChevronRight, Ticket } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export const metadata: Metadata = { robots: { index: false } };

/** Order status → ticket status label and colour. */
const STATUS: Record<
  string,
  {
    key: 'confirmed' | 'awaiting_payment' | 'waitlisted' | 'cancelled' | 'expired' | 'refunded';
    tone: string;
  }
> = {
  paid: { key: 'confirmed', tone: 'bg-cat-outdoor-bg text-cat-outdoor-fg' },
  partially_paid: { key: 'confirmed', tone: 'bg-cat-outdoor-bg text-cat-outdoor-fg' },
  awaiting_payment: { key: 'awaiting_payment', tone: 'bg-highlight-soft text-highlight' },
  pending: { key: 'waitlisted', tone: 'bg-secondary text-secondary-foreground' },
  cancelled: { key: 'cancelled', tone: 'bg-muted text-muted-foreground' },
  expired: { key: 'expired', tone: 'bg-muted text-muted-foreground' },
  refunded: { key: 'refunded', tone: 'bg-muted text-muted-foreground' },
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
          title={t('title')}
          hint={t('signIn')}
          action={
            <Button asChild className="min-h-11">
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
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <nav aria-label={t('title')} className="mt-4 flex gap-1 rounded-full bg-muted p-1">
        {(['upcoming', 'past'] as const).map((name) => (
          <Link
            key={name}
            href={name === 'past' ? '/tickets?tab=past' : '/tickets'}
            aria-current={tab === name ? 'page' : undefined}
            className={cn(
              'flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-medium',
              tab === name ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(name)}
            <span className="ltr-nums text-xs text-muted-foreground">
              ({name === 'past' ? past.length : upcoming.length})
            </span>
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={tab === 'past' ? t('noPast') : t('empty')}
          hint={t('emptyHint')}
          action={
            <Button asChild className="min-h-11">
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
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md',
                    tab === 'past' && 'opacity-80',
                  )}
                >
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-secondary py-2 text-center">
                    <span className="ltr-nums text-xl leading-none font-bold">
                      {dayFormat(locale).format(order.event.startsAt)}
                    </span>
                    <span className="mt-1 text-xs uppercase">
                      {monthFormat(locale).format(order.event.startsAt)}
                    </span>
                  </div>
                  <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
                    {order.event.coverUrl ? (
                      <Image
                        src={order.event.coverUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <Ticket
                        className="m-auto mt-5 size-6 text-muted-foreground"
                        aria-hidden="true"
                      />
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
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {status ? (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-semibold',
                            status.tone,
                          )}
                        >
                          {t(`status.${status.key}`)}
                        </span>
                      ) : null}
                      {due > 0 && ['awaiting_payment', 'partially_paid'].includes(order.status) ? (
                        <span className="text-xs font-semibold text-highlight">
                          {t('amountDue', { amount: formatPrice(due, locale) })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground rtl:rotate-180"
                    aria-hidden="true"
                  />
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
