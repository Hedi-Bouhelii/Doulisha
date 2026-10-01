import { formatDate, type Locale } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { Lock, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { HillsBackdrop } from '@/components/doulisha/decor';
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
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="relative isolate flex flex-wrap items-center gap-5 overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
        <HillsBackdrop className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-20 opacity-80" />
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-semibold text-primary-foreground shadow-raised ring-4 ring-card sm:size-24">
          {member.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar from Google, Facebook or uploads, any size
            <img src={member.image} alt="" className="size-full object-cover" />
          ) : (
            initials(member.name)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1
            className="font-display text-2xl font-bold tracking-tight sm:text-4xl"
            dir="auto"
            data-testid="member-name"
          >
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
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-card px-5 text-sm font-semibold shadow-xs transition-colors hover:border-primary/40 hover:bg-primary-soft/50"
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
          className="mt-8 flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 text-sm shadow-card"
          data-testid="member-private"
        >
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t('private')}
        </p>
      ) : (
        <>
          {member.bio ? (
            <p className="mt-8 text-lg leading-relaxed whitespace-pre-wrap" dir="auto">
              {member.bio}
            </p>
          ) : null}
          {member.organizer ? (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-sm text-primary">
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
          <section aria-labelledby="attending" className="mt-10" data-testid="member-attending">
            <h2 id="attending" className="mb-4 font-sans text-xl font-semibold">
              {t('attending')}
            </h2>
            {!member.showAttending ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-sm text-muted-foreground">
                {t('attendingHidden')}
              </p>
            ) : member.attending.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-sm text-muted-foreground">
                {t('attendingNone')}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
