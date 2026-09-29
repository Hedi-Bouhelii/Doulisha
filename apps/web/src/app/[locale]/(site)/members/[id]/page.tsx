import { formatDate, type Locale } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { Lock, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { EventCard } from '@/components/doulisha/event-card';
import { initials } from '@/components/doulisha/friends-going';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

import { MemberActions } from './member-actions';

const loadMember = cache(async (userId: string) => {
  try {
    return await (await api()).members.byId({ userId });
  } catch (error) {
    if (error instanceof TRPCError && ['NOT_FOUND', 'BAD_REQUEST'].includes(error.code)) {
      notFound();
    }
    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/members/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const member = await loadMember(id);
  // Member pages stay out of search engines (ACC-06).
  return { title: member.name, robots: { index: false, follow: false } };
}

/** A member's page (ADR 0022): what they chose to show (ACC-06). */
export default async function MemberPage({ params }: PageProps<'/[locale]/members/[id]'>) {
  const locale = (await resolveLocale(params)) as Locale;
  const { id } = await params;
  const member = await loadMember(id);
  const session = await getSession();
  const signedIn = Boolean(session && !session.user.isAnonymous);
  const t = await getTranslations('Member');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center gap-4">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
          {member.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar from Google, Facebook or uploads, any size
            <img src={member.image} alt="" className="size-full object-cover" />
          ) : (
            initials(member.name)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl" dir="auto" data-testid="member-name">
            {member.name}
          </h1>
          {!member.isPrivate ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              {member.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden="true" />
                  {member.city}
                </span>
              ) : null}
              <span>{t('memberSince', { date: formatDate(member.memberSince, locale) })}</span>
            </p>
          ) : null}
        </div>
        {member.isSelf ? (
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-accent"
            data-testid="member-edit-privacy"
          >
            {t('editPrivacy')}
          </Link>
        ) : signedIn ? (
          <MemberActions
            user={{ id: member.id, name: member.name }}
            blocked={member.viewerBlocked}
          />
        ) : null}
      </header>

      {member.isPrivate ? (
        <p
          className="mt-8 flex items-center gap-2 rounded-xl bg-muted p-4 text-sm"
          data-testid="member-private"
        >
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t('private')}
        </p>
      ) : (
        <>
          {member.bio ? (
            <p className="mt-6 whitespace-pre-wrap" dir="auto">
              {member.bio}
            </p>
          ) : null}
          {member.organizer ? (
            <p className="mt-6 text-sm">
              {t('organizes')}{' '}
              <Link
                href={`/organizers/${member.organizer.slug}`}
                className="font-semibold text-primary hover:underline"
                dir="auto"
              >
                {member.organizer.name}
              </Link>
            </p>
          ) : null}
          <section aria-labelledby="attending" className="mt-8" data-testid="member-attending">
            <h2 id="attending" className="mb-4 font-sans text-lg font-semibold">
              {t('attending')}
            </h2>
            {!member.showAttending ? (
              <p className="text-sm text-muted-foreground">{t('attendingHidden')}</p>
            ) : member.attending.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('attendingNone')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {member.attending.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
            {member.isSelf && !member.attendancePublic ? (
              <p className="mt-3 text-xs text-muted-foreground">{t('attendingSelfHint')}</p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
