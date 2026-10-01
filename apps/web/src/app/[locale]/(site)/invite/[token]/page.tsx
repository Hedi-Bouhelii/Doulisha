import { formatEventDateTime } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { CalendarDays, MapPin, PartyPopper, Sparkles, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { GroupChatButton } from '@/components/doulisha/chat';
import { HillsBackdrop } from '@/components/doulisha/decor';
import { FriendsGoing, initials } from '@/components/doulisha/friends-going';
import { Badge } from '@/components/ui/badge';
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

  const statusTone = {
    going: 'success',
    maybe: 'warning',
    not_going: 'neutral',
    invited: 'neutral',
    seen: 'neutral',
  } as const;

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-raised">
        <div className="relative aspect-[16/9] bg-highlight-soft">
          {invitation.coverUrl ? (
            <Image
              src={invitation.coverUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 672px) 672px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <HillsBackdrop className="absolute inset-x-0 bottom-0 h-2/3" />
              <PartyPopper className="relative size-16 text-highlight" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="relative space-y-4 px-6 pt-8 pb-8 text-center sm:px-10">
          <p className="absolute -top-4 start-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-highlight px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-highlight-foreground shadow-raised rtl:translate-x-1/2">
            <Sparkles className="size-4" aria-hidden="true" />
            {t('invitedBy', { name: invitation.hostName })}
          </p>
          <h1
            className="font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl"
            data-testid="invite-title"
          >
            {invitation.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 font-medium text-primary">
              <CalendarDays className="size-4" aria-hidden="true" />
              {formatEventDateTime(invitation.startsAt, locale)}
            </span>
            {place ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 font-medium">
                <MapPin className="size-4" aria-hidden="true" />
                {place}
              </span>
            ) : null}
          </div>
          {invitation.addressHidden ? (
            <p className="text-sm text-muted-foreground">{t('addressHidden')}</p>
          ) : null}
          {invitation.description ? (
            <p className="text-start leading-relaxed whitespace-pre-line text-foreground/90">
              {invitation.description}
            </p>
          ) : null}
          <p
            className="flex items-center justify-center gap-1.5 text-sm font-semibold"
            data-testid="invite-counts"
          >
            <Users className="size-4 text-primary" aria-hidden="true" />
            {t('counts', { going: invitation.counts.going, maybe: invitation.counts.maybe })}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {cancelled ? (
          <p className="rounded-2xl bg-destructive-soft px-5 py-4 text-destructive">
            {t('cancelled')}
          </p>
        ) : past ? (
          <p className="rounded-2xl bg-muted px-5 py-4 text-muted-foreground">{t('past')}</p>
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

      {/* COM-06: hosts and guests who answered going or maybe share one chat. */}
      {!cancelled &&
      (invitation.isHost ||
        invitation.myRsvp?.status === 'going' ||
        invitation.myRsvp?.status === 'maybe') ? (
        <div className="mt-6 flex justify-center">
          <GroupChatButton eventId={invitation.eventId} />
        </div>
      ) : null}

      <section aria-labelledby="guests-title" className="mt-10">
        <h2 id="guests-title" className="mb-4 font-sans text-xl font-semibold">
          {t('guestList')}
        </h2>
        {invitation.guests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-sm text-muted-foreground">
            {t('guestListHidden')}
          </p>
        ) : (
          <>
            <FriendsGoing
              people={invitation.guests
                .filter((g) => g.status === 'going')
                .map((g) => ({ name: g.name, image: g.image }))}
              count={invitation.counts.going}
            />
            <ul
              className="mt-4 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card"
              data-testid="guest-list"
            >
              {invitation.guests.map((guest, index) => (
                <li
                  key={index}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-3 font-medium">
                    <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {initials(guest.name)}
                    </span>
                    {guest.name}
                    {guest.plusOnes > 0 ? (
                      <span className="ltr-nums text-muted-foreground"> +{guest.plusOnes}</span>
                    ) : null}
                  </span>
                  <Badge
                    variant={statusTone[guest.status as keyof typeof statusTone] ?? 'neutral'}
                    dot
                  >
                    {t(`status.${guest.status as 'going'}`)}
                  </Badge>
                  {guest.dietaryNotes ? (
                    <span className="w-full ps-12 text-xs text-muted-foreground">
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
