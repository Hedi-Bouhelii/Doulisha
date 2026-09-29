import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/doulisha/empty-state';
import { EventCard } from '@/components/doulisha/event-card';
import { FollowButton } from '@/components/doulisha/follow-button';
import { Button } from '@/components/ui/button';
import { resolveLocale } from '@/i18n/locale';
import { Link, redirect } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

export async function generateMetadata({ params }: PageProps<'/[locale]/feed'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Feed' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * SOC-03 feed: upcoming events of the organizers the member follows, and
 * organizers to follow. Public events only (TRS-06).
 */
export default async function FeedPage({ params }: PageProps<'/[locale]/feed'>) {
  const locale = await resolveLocale(params);
  const session = await getSession();
  if (!session || session.user.isAnonymous) {
    redirect({ href: `/sign-in?next=${encodeURIComponent('/feed')}`, locale });
  }
  const feed = await (await api()).organizers.feed();
  const t = await getTranslations('Feed');

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('intro')}</p>

      {feed.following.length > 0 ? (
        <section aria-labelledby="following" className="mt-6">
          <h2 id="following" className="mb-2 font-sans text-sm font-semibold">
            {t('following', { count: feed.following.length })}
          </h2>
          <ul className="flex flex-wrap gap-2" data-testid="feed-following">
            {feed.following.map((organizer) => (
              <li key={organizer.id}>
                <Link
                  href={`/organizers/${organizer.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
                  dir="auto"
                >
                  {organizer.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="feed-events" className="mt-8">
        <h2 id="feed-events" className="mb-4 font-sans text-lg font-semibold">
          {t('upcoming')}
        </h2>
        {feed.events.length === 0 ? (
          <EmptyState
            title={feed.following.length === 0 ? t('emptyNoFollows') : t('emptyNoEvents')}
            hint={t('emptyHint')}
            action={
              <Button asChild variant="outline" className="min-h-11 rounded-full">
                <Link href="/explore">{t('explore')}</Link>
              </Button>
            }
          />
        ) : (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="feed-events"
          >
            {feed.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {feed.suggestions.length > 0 ? (
        <section aria-labelledby="suggestions" className="mt-10">
          <h2 id="suggestions" className="mb-4 font-sans text-lg font-semibold">
            {t('suggestions')}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="feed-suggestions">
            {feed.suggestions.map((organizer) => (
              <li
                key={organizer.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Link href={`/organizers/${organizer.slug}`} className="min-w-0 hover:underline">
                  <span className="block truncate font-semibold" dir="auto">
                    {organizer.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('upcomingCount', { count: organizer.upcoming })}
                  </span>
                </Link>
                <FollowButton
                  organizerProfileId={organizer.id}
                  following={false}
                  signedIn
                  returnPath="/feed"
                  compact
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
