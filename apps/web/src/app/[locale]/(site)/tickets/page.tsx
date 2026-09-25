import { formatEventDateTime, formatPrice } from '@doulisha/i18n';
import { Ticket } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export const metadata: Metadata = { robots: { index: false } };

/** "My tickets": every booking of the member or guest on this device. */
export default async function TicketsPage({ params }: PageProps<'/[locale]/tickets'>) {
  const locale = await resolveLocale(params);
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
              <Link href="/sign-in?next=/tickets">{t('signIn')}</Link>
            </Button>
          }
        />
      </div>
    );
  }
  const orders = await (await api()).booking.mine();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      {orders.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={t('empty')}
          hint={t('emptyHint')}
          action={
            <Button asChild className="min-h-11">
              <Link href="/explore">{t('viewEvent')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.reference}>
              <Link
                href={`/tickets/${order.reference}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
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
                  <p className="truncate font-semibold">{order.event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.event.city ? `${order.event.city} · ` : ''}
                    {formatEventDateTime(order.event.startsAt, locale)}
                  </p>
                  <p className="ltr-nums text-xs text-muted-foreground">{order.reference}</p>
                </div>
                <div className="text-end text-sm">
                  <p className="font-semibold">
                    {order.totalMillimes > 0 ? formatPrice(order.totalMillimes, locale) : null}
                  </p>
                  <p className="text-muted-foreground">
                    {order.status in STATUS ? t(`status.${STATUS[order.status]!}`) : order.status}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Order status → ticket status label. */
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
