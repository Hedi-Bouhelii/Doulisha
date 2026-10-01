import { Compass, Rss } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/doulisha/empty-state';
import { EventCard } from '@/components/doulisha/event-card';
import { FollowButton } from '@/components/doulisha/follow-button';
import { initials } from '@/components/doulisha/friends-going';
import { Container, PageHeader, SectionHeading } from '@/components/doulisha/page';
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
    <Container size="wide">
      <PageHeader
        title={t('title')}
        description={t('intro')}
        actions={
          <Button asChild variant="outline">
            <Link href="/explore">
              <Compass aria-hidden="true" />
              {t('explore')}
            </Link>
          </Button>
        }
      />

      {feed.following.length > 0 ? (
        <section aria-labelledby="following" className="mt-8">
          <h2 id="following" className="mb-3 font-sans text-sm font-semibold text-muted-foreground">
            {t('following', { count: feed.following.length })}
          </h2>
          <ul
            className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
            data-testid="feed-following"
          >
            {feed.following.map((organizer) => (
              <li key={organizer.id} className="shrink-0">
                <Link
                  href={`/organizers/${organizer.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-card py-1 ps-1 pe-4 text-sm font-medium shadow-xs transition-colors hover:border-primary/35 hover:bg-primary-soft/50"
                  dir="auto"
                >
                  <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {organizer.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- organizer logo, any size
                      <img src={organizer.logoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      initials(organizer.name)
                    )}
                  </span>
                  {organizer.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="feed-events" className="mt-10">
        <SectionHeading id="feed-events" title={t('upcoming')} />
        {feed.events.length === 0 ? (
          <EmptyState
            icon={Rss}
            title={feed.following.length === 0 ? t('emptyNoFollows') : t('emptyNoEvents')}
            hint={t('emptyHint')}
            action={
              <Button asChild variant="outline">
                <Link href="/explore">{t('explore')}</Link>
              </Button>
            }
          />
        ) : (
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="feed-events"
          >
            {feed.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {feed.suggestions.length > 0 ? (
        <section aria-labelledby="suggestions" className="mt-12">
          <SectionHeading id="suggestions" title={t('suggestions')} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="feed-suggestions">
            {feed.suggestions.map((organizer) => (
              <li
                key={organizer.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card"
              >
                <Link
                  href={`/organizers/${organizer.slug}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft text-sm font-semibold text-primary">
                    {organizer.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- organizer logo, any size
                      <img src={organizer.logoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      initials(organizer.name)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold hover:underline" dir="auto">
                      {organizer.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('upcomingCount', { count: organizer.upcoming })}
                    </span>
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
    </Container>
  );
}
