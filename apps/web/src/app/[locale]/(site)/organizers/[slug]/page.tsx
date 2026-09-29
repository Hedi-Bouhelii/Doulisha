import { TRPCError } from '@trpc/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { EventCard } from '@/components/doulisha/event-card';
import { FollowButton } from '@/components/doulisha/follow-button';
import { OrganizerProfileView } from '@/components/doulisha/organizer-profile-view';
import { resolveLocale } from '@/i18n/locale';
import { getSession } from '@/server/auth';
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

/** ACC-03 public organizer page: profile, photos, upcoming and past events, follow (SOC-01). */
export default async function OrganizerPage({ params }: PageProps<'/[locale]/organizers/[slug]'>) {
  await resolveLocale(params);
  const { slug } = await params;
  const [organizer, categories] = await Promise.all([
    loadOrganizer(slug),
    (await api()).catalog.categories(),
  ]);
  const session = await getSession();
  const signedIn = Boolean(session && !session.user.isAnonymous);
  const t = await getTranslations('OrganizerProfile');
  const tFollow = await getTranslations('Follow');
  const tStates = await getTranslations('States');
  const names = new Map(categories.map((c) => [c.slug, c.name]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <OrganizerProfileView
        profile={{
          ...organizer,
          categories: organizer.categories.map((c) => names.get(c) ?? c),
        }}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {organizer.viewerIsOwner ? null : (
              <FollowButton
                organizerProfileId={organizer.id}
                following={organizer.viewerFollows}
                signedIn={signedIn}
                returnPath={`/organizers/${organizer.slug}`}
              />
            )}
            <span className="text-sm text-muted-foreground" data-testid="follower-count">
              {tFollow('followers', { count: organizer.followers })}
            </span>
          </div>
        }
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
        {organizer.pastEvents.length > 0 ? (
          <section aria-labelledby="past" className="mt-10" data-testid="past-events">
            <h2 id="past" className="mb-4 font-sans text-lg font-semibold">
              {t('past', { count: organizer.pastEvents.length })}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {organizer.pastEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        ) : null}
      </OrganizerProfileView>
    </div>
  );
}
