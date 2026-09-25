import { formatEventDateTime } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { FriendsGoing } from '@/components/doulisha/friends-going';
import { resolveLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';

import { RsvpForm } from './rsvp-form';

const loadInvitation = cache(async (token: string) => {
  try {
    return await (await api()).invitations.byToken({ token });
  } catch (error) {
    if (
      error instanceof TRPCError &&
      (error.code === 'NOT_FOUND' || error.code === 'BAD_REQUEST')
    ) {
      notFound();
    }
    throw error;
  }
});

/** Invitations are private: never indexed, never shown in previews beyond the title. */
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/invite/[token]'>): Promise<Metadata> {
  const { token } = await params;
  const invitation = await loadInvitation(token);
  return { title: invitation.title, robots: { index: false, follow: false } };
}

/** INV-02/03: the invitation page, where guests answer without an account. */
export default async function InvitationPage({ params }: PageProps<'/[locale]/invite/[token]'>) {
  const locale = await resolveLocale(params);
  const { token } = await params;
  const invitation = await loadInvitation(token);
  const session = await getSession();
  const t = await getTranslations('Invite');
  const past = invitation.startsAt < new Date();
  const cancelled = invitation.status === 'cancelled';
  const place = [invitation.venueName, invitation.address, invitation.city]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-2xl border-4 border-highlight bg-card">
        {invitation.coverUrl ? (
          <div className="relative aspect-[16/9] bg-muted">
            <Image
              src={invitation.coverUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 672px) 672px, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="space-y-3 p-6 text-center">
          <p className="inline-block rounded-full bg-highlight px-4 py-1 text-sm font-semibold text-white">
            {t('invitedBy', { name: invitation.hostName })}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl" data-testid="invite-title">
            {invitation.title}
          </h1>
          <p className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            {formatEventDateTime(invitation.startsAt, locale)}
          </p>
          {place ? (
            <p className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              {place}
            </p>
          ) : null}
          {invitation.addressHidden ? (
            <p className="text-sm text-muted-foreground">{t('addressHidden')}</p>
          ) : null}
          {invitation.description ? (
            <p className="whitespace-pre-line text-start">{invitation.description}</p>
          ) : null}
          <p
            className="flex items-center justify-center gap-1.5 text-sm font-medium"
            data-testid="invite-counts"
          >
            <Users className="size-4" aria-hidden="true" />
            {t('counts', { going: invitation.counts.going, maybe: invitation.counts.maybe })}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {cancelled ? (
          <p className="rounded-lg bg-highlight-soft p-4 text-highlight">{t('cancelled')}</p>
        ) : past ? (
          <p className="rounded-lg bg-muted p-4 text-muted-foreground">{t('past')}</p>
        ) : invitation.isHost ? (
          <p className="text-center text-sm">
            <Link href="/host" className="font-semibold text-primary hover:underline">
              {t('host')}
            </Link>
          </p>
        ) : (
          <RsvpForm
            token={token}
            current={invitation.myRsvp}
            isMember={Boolean(session && !session.user.isAnonymous)}
          />
        )}
      </div>

      <section aria-labelledby="guests-title" className="mt-8">
        <h2 id="guests-title" className="mb-3 font-sans text-lg font-semibold">
          {t('guestList')}
        </h2>
        {invitation.guests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('guestListHidden')}</p>
        ) : (
          <>
            <FriendsGoing
              people={invitation.guests
                .filter((g) => g.status === 'going')
                .map((g) => ({ name: g.name, image: g.image }))}
              count={invitation.counts.going}
            />
            <ul
              className="mt-4 divide-y divide-border rounded-xl border border-border bg-card"
              data-testid="guest-list"
            >
              {invitation.guests.map((guest, index) => (
                <li key={index} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="font-medium">
                    {guest.name}
                    {guest.plusOnes > 0 ? (
                      <span className="ltr-nums text-muted-foreground"> +{guest.plusOnes}</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    {t(`status.${guest.status as 'going'}`)}
                  </span>
                  {guest.dietaryNotes ? (
                    <span className="w-full text-xs text-muted-foreground">
                      {guest.dietaryNotes}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </article>
  );
}
