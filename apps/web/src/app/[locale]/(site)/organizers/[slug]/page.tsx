import { TRPCError } from '@trpc/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { EventCard } from '@/components/doulisha/event-card';
import { OrganizerProfileView } from '@/components/doulisha/organizer-profile-view';
import { resolveLocale } from '@/i18n/locale';
import { api } from '@/trpc/server';

const loadOrganizer = cache(async (slug: string) => {
  try {
    return await (await api()).organizers.bySlug({ slug });
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/organizers/[slug]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const organizer = await loadOrganizer(slug);
  return {
    title: organizer.name,
    description: organizer.bio?.slice(0, 160),
    alternates: { canonical: `/${locale}/organizers/${slug}` },
    openGraph: organizer.coverUrl ? { images: [organizer.coverUrl] } : undefined,
  };
}

/** ACC-03 public organizer page: profile, past-event photos, upcoming events. */
export default async function OrganizerPage({ params }: PageProps<'/[locale]/organizers/[slug]'>) {
  await resolveLocale(params);
  const { slug } = await params;
  const [organizer, categories] = await Promise.all([
    loadOrganizer(slug),
    (await api()).catalog.categories(),
  ]);
  const t = await getTranslations('OrganizerProfile');
  const tStates = await getTranslations('States');
  const names = new Map(categories.map((c) => [c.slug, c.name]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <OrganizerProfileView
        profile={{
          ...organizer,
          categories: organizer.categories.map((c) => names.get(c) ?? c),
        }}
      >
        <section aria-labelledby="upcoming" className="mt-8">
          <h2 id="upcoming" className="mb-4 font-sans text-lg font-semibold">
            {t('upcoming')}
          </h2>
          {organizer.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tStates('emptyEventsHint')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {organizer.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </OrganizerProfileView>
    </div>
  );
}
