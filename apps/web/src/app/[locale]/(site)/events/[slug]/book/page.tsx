import { TRPCError } from '@trpc/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { api } from '@/trpc/server';

import { CheckoutFlow } from './checkout-flow';

export const metadata: Metadata = { robots: { index: false } };

/** PAY-01 checkout: tickets, details and payment in at most three steps. */
export default async function BookPage({ params }: PageProps<'/[locale]/events/[slug]/book'>) {
  await resolveLocale(params);
  const { slug } = await params;
  const caller = await api();
  const event = await caller.events.bySlug({ slug }).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') notFound();
    throw error;
  });
  const [options, me] = await Promise.all([
    caller.booking.options({ eventId: event.id }),
    caller.me.get(),
  ]);
  const t = await getTranslations('Event');
  const open =
    (event.status === 'published' || event.status === 'full') && event.startsAt > new Date();

  if (!open) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <EmptyState
          title={t('bookingClosed')}
          action={
            <Button asChild className="min-h-11">
              <Link href={`/events/${slug}`}>{t('backToExplore')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <CheckoutFlow
      event={{
        id: event.id,
        slug: event.slug,
        title: event.title,
        startsAt: event.startsAt,
        city: event.city,
        coverUrl: event.coverUrl,
        cancellationPolicy: event.cancellationPolicy,
      }}
      options={options}
      buyer={me && !me.isAnonymous ? { name: me.name, phone: me.phoneNumber } : null}
    />
  );
}
