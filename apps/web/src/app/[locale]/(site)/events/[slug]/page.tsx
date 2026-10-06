import type { EventDetailDto } from '@doulisha/api';
import { formatDate, formatEventDateTime, formatTime, type Locale, locales } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  EyeOff,
  MapPin,
  Settings2,
  ShieldCheck,
  Star,
  Ticket,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';

import { accentOf, CategoryIcon } from '@/components/doulisha/category-icon';
import { EmptyState } from '@/components/doulisha/empty-state';
import { FriendsGoing } from '@/components/doulisha/friends-going';
import { AskOrganizerButton } from '@/components/doulisha/chat';
import { EventWall } from '@/components/doulisha/event-wall';
import { OrganizerCard } from '@/components/doulisha/organizer-card';
import { PlacesLeft } from '@/components/doulisha/places-left';
import { PriceTag } from '@/components/doulisha/price-tag';
import { ReportButton } from '@/components/doulisha/safety';
import { ShareBar } from '@/components/doulisha/share-bar';
import { StickyCTA } from '@/components/doulisha/sticky-cta';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@/i18n/navigation';
import { absoluteUrl, jsonLdScript, siteUrl } from '@/lib/site';
import { cn } from '@/lib/utils';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';
import { resolveLocale } from '@/i18n/locale';

const loadEvent = cache(async (slug: string): Promise<EventDetailDto> => {
  try {
    return await (await api()).events.bySlug({ slug });
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }
});

const shareImage = (slug: string, locale: Locale) =>
  `/api/og/event?slug=${encodeURIComponent(slug)}&locale=${locale}`;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/events/[slug]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const event = await loadEvent(slug);
  const description = event.description?.slice(0, 160);
  return {
    title: event.title,
    description,
    alternates: {
      canonical: `/${locale}/events/${slug}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/events/${slug}`])),
    },
    openGraph: {
      type: 'website',
      title: event.title,
      description,
      locale,
      images: [{ url: `${shareImage(slug, locale)}&format=og`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
    // Unlisted events are reachable by link only (EVT-06): keep them out of search.
    robots: event.visibility === 'unlisted' ? { index: false, follow: false } : undefined,
  };
}

/** schema.org Event, for search results (DSC-03). Public events only. */
function eventJsonLd(event: EventDetailDto, locale: Locale) {
  const url = absoluteUrl(`/${locale}/events/${event.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description ?? undefined,
    url,
    inLanguage: event.language,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt?.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: event.coverUrl ? [new URL(event.coverUrl, siteUrl).toString()] : undefined,
    location: {
      '@type': 'Place',
      name: event.venueName ?? event.city ?? undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address ?? undefined,
        addressLocality: event.city ?? undefined,
        addressCountry: 'TN',
      },
    },
    organizer: event.organizer
      ? { '@type': 'Organization', name: event.organizer.name }
      : undefined,
    offers: event.ticketTypes.map((ticket) => ({
      '@type': 'Offer',
      name: ticket.name,
      price: (ticket.priceMillimes / 1000).toFixed(3),
      priceCurrency: 'TND',
      availability: ticket.soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url,
    })),
  };
}

/** Event page (DSC-03): details, booking entry point (TKT-01) and sharing (SHR-01/02). */
export default async function EventPage({ params }: PageProps<'/[locale]/events/[slug]'>) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const event = await loadEvent(slug);
  const session = await getSession();
  const signedIn = Boolean(session && !session.user.isAnonymous);
  // COM-05: participants reach the organizer here instead of hunting for their social pages.
  const ask = event.canManage ? null : (
    <AskOrganizerButton
      eventId={event.id}
      eventPath={`/events/${event.slug}`}
      signedIn={signedIn}
    />
  );
  const t = await getTranslations('Event');
  const tLang = await getTranslations('Languages');
  const tShare = await getTranslations('Share');
  const accent = accentOf(event.category.accent);
  const isFree = event.registrationType === 'free_rsvp';
  const soldOut = event.placesLeft === 0;

  const taken = event.capacity ? Math.min(event.placesTaken, event.capacity) : null;
  const fillPercent =
    event.capacity && taken !== null ? Math.round((taken / event.capacity) * 100) : null;

  return (
    <article className="pb-28 lg:pb-16">
      {event.visibility === 'public' ? (
        <script
          type="application/ld+json"
          // JSON-LD must be raw; jsonLdScript escapes "<" so user text cannot close the script.
          dangerouslySetInnerHTML={{ __html: jsonLdScript(eventJsonLd(event, locale)) }}
        />
      ) : null}
      {/* Immersive hero: the cover, then category, title, date and place over it. */}
      <header className="relative isolate flex min-h-[24rem] items-end overflow-hidden bg-foreground sm:min-h-[30rem]">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
        ) : (
          <div
            className={cn('absolute inset-0 -z-10 flex items-center justify-center', accent.tile)}
          >
            <CategoryIcon name={event.category.icon} className="size-24 opacity-40" />
          </div>
        )}
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/35 to-black/15" />
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-6xl items-center justify-between px-4 pt-4 sm:px-6">
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="bg-card/90 shadow-xs backdrop-blur-sm hover:bg-card"
          >
            <Link href="/explore" aria-label={t('backToExplore')}>
              <ArrowLeft className="size-5 rtl:rotate-180" />
            </Link>
          </Button>
          {event.canManage ? (
            <Button
              asChild
              variant="secondary"
              className="bg-card/90 shadow-xs backdrop-blur-sm hover:bg-card"
            >
              <Link href={`/organizer/events/${event.id}`} data-testid="manage-event">
                <Settings2 className="size-4" aria-hidden="true" />
                {t('manage')}
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 text-white sm:px-6 sm:pb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <CategoryIcon name={event.category.icon} className="size-3.5" />
            {event.category.name}
          </span>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {event.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-white/90 sm:text-base">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              <time dateTime={event.startsAt.toISOString()}>
                {formatEventDateTime(event.startsAt, locale)}
              </time>
            </span>
            {event.city || event.venueName ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {[event.venueName, event.city].filter(Boolean).join(' · ')}
              </span>
            ) : null}
            {event.organizer ? (
              <span className="flex items-center gap-1.5">
                {t('byOrganizer', { name: event.organizer.name })}
                {event.organizer.verified ? (
                  <BadgeCheck className="size-4" aria-label={t('verified')} />
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <div className="min-w-0">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Fact icon={<CalendarDays className="size-5" />} label={t('date')}>
              <DateRange start={event.startsAt} end={event.endsAt} />
            </Fact>
            <Fact icon={<Ticket className="size-5" />} label={t('price')}>
              <PriceTag millimes={event.priceFromMillimes} className="text-base" />
              <span className="block text-xs text-muted-foreground">
                {event.registrationType === 'pay_at_door'
                  ? t('payAtDoor')
                  : event.registrationType === 'deposit'
                    ? t('depositAvailable')
                    : isFree
                      ? null
                      : t('onlineTicket')}
              </span>
            </Fact>
            <Fact icon={<Users className="size-5" />} label={t('spots')}>
              {event.capacity !== null && event.placesLeft !== null ? (
                <span className="font-semibold">
                  {t('spotsLeft', { left: event.placesLeft, capacity: event.capacity })}
                </span>
              ) : (
                <PlacesLeft capacity={event.capacity} left={event.placesLeft} />
              )}
            </Fact>
          </dl>
          {event.visibility === 'unlisted' ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <EyeOff className="size-4" aria-hidden="true" />
              {t('unlisted')}
            </p>
          ) : null}

          <Tabs defaultValue="about" className="mt-8">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="about">{t('about')}</TabsTrigger>
              <TabsTrigger value="details">{t('details')}</TabsTrigger>
              <TabsTrigger value="organizer">{t('organizer')}</TabsTrigger>
              <TabsTrigger value="reviews">{t('reviews')}</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6 space-y-8">
              {event.description ? (
                <p
                  lang={event.language}
                  className="text-base leading-relaxed whitespace-pre-line text-foreground/90 sm:text-[1.0625rem]"
                >
                  {event.description}
                </p>
              ) : null}
              {event.facts.length > 0 ? (
                <dl
                  className="grid gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-card sm:grid-cols-2"
                  data-testid="event-facts"
                >
                  {event.facts.map((fact) => (
                    <div
                      key={fact.key}
                      className={cn(
                        'rounded-xl bg-muted/60 px-3.5 py-3',
                        fact.value && fact.value.length > 40 ? 'sm:col-span-2' : undefined,
                      )}
                    >
                      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {fact.value === null ? (
                          <span className="flex items-center gap-1.5 text-sm font-medium tracking-normal text-foreground normal-case">
                            <Check className="size-4 text-primary" aria-hidden="true" />
                            {fact.label}
                          </span>
                        ) : (
                          fact.label
                        )}
                      </dt>
                      {fact.value !== null ? (
                        <dd lang={event.language} className="mt-1 font-medium whitespace-pre-line">
                          {fact.value}
                        </dd>
                      ) : null}
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {t('writtenIn', { language: tLang(event.language) })}
                {event.minAge ? ` · ${t('minAge', { age: event.minAge })}` : ''}
              </p>
              <section aria-labelledby="people-going">
                <h2 id="people-going" className="mb-3 font-sans text-lg font-semibold">
                  {t('peopleGoing')}
                </h2>
                <FriendsGoing people={event.publicAttendees} count={event.placesTaken} />
              </section>
            </TabsContent>

            <TabsContent value="details" className="mt-6 space-y-8">
              <Brief event={event} />
              {event.meetingPoints.length > 0 ? (
                <Section title={t('meetingPoints')}>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {event.meetingPoints.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
                      >
                        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                        <TimeOf date={p.meetAt} />
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
              {event.programme.length > 0 ? (
                <Section title={t('programme')}>
                  <ol className="relative space-y-4 ps-6 before:absolute before:inset-y-2 before:start-[0.3125rem] before:w-0.5 before:rounded-full before:bg-primary/20">
                    {event.programme.map((step) => (
                      <li key={step.id} className="relative">
                        <span
                          aria-hidden="true"
                          className="absolute -start-6 top-1.5 size-3 rounded-full border-2 border-primary bg-background"
                        />
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <span className="font-medium">{step.title}</span>
                          {step.startsAt ? <TimeOf date={step.startsAt} /> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </Section>
              ) : null}
              <Section title={t('cancellationPolicy')}>
                <p className="flex items-start gap-3 rounded-2xl bg-info-soft px-4 py-3 text-sm text-info">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {t(`policy.${event.cancellationPolicy}`)}
                </p>
              </Section>
              {event.locationHidden ? (
                <p className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <EyeOff className="size-4 shrink-0" aria-hidden="true" />
                  {t('locationHidden')}
                </p>
              ) : event.address ? (
                <Section title={t('location')}>
                  <p className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {event.address}
                  </p>
                </Section>
              ) : null}
            </TabsContent>

            <TabsContent value="organizer" className="mt-6 space-y-4">
              {event.organizer ? <OrganizerCard organizer={event.organizer} /> : null}
              {ask}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <EmptyState icon={Star} size="compact" title={t('reviews')} hint={t('noReviews')} />
            </TabsContent>
          </Tabs>

          <section className="mt-10 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
            <ShareBar
              url={absoluteUrl(`/${locale}/events/${event.slug}`)}
              message={tShare('message', {
                title: event.title,
                date: formatEventDateTime(event.startsAt, locale),
              })}
              imageBase={shareImage(event.slug, locale)}
            />
          </section>

          {/* SOC-04: questions, news and photos about the event. */}
          <div className="mt-10">
            <EventWall
              eventId={event.id}
              viewerId={signedIn ? session!.user.id : null}
              signInPath={`/events/${event.slug}`}
            />
          </div>

          {signedIn && !event.canManage ? (
            <div className="mt-6 flex justify-end">
              <ReportButton target={{ type: 'event', id: event.id }} />
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <StickyCTA
            summary={
              <>
                <p className="hidden text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">
                  {t('price')}
                </p>
                <PriceTag
                  millimes={event.priceFromMillimes}
                  className="block text-base lg:mt-1 lg:text-3xl lg:tracking-tight"
                />
                <PlacesLeft
                  capacity={event.capacity}
                  left={event.placesLeft}
                  className="text-xs lg:text-sm"
                />
              </>
            }
            details={
              <div className="space-y-3 text-sm">
                {fillPercent !== null ? (
                  <div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={t('spots')}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={fillPercent}
                    >
                      <div
                        className={cn(
                          'h-full rounded-full',
                          fillPercent >= 80 ? 'bg-highlight' : 'bg-primary',
                        )}
                        style={{ width: `${Math.max(fillPercent, 3)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {formatEventDateTime(event.startsAt, locale)}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {t('secureBooking')}
                </p>
              </div>
            }
            action={
              !event.bookingOpen || (soldOut && !event.waitlistEnabled) ? (
                <Button size="lg" disabled className="w-full px-6">
                  {event.bookingOpen ? t('full') : t('bookingClosed')}
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-1 lg:items-stretch">
                  <Button asChild size="lg" className="px-6 lg:w-full">
                    <Link href={`/events/${event.slug}/book`} data-testid="book-cta">
                      {soldOut ? t('joinWaitlist') : isFree ? t('rsvp') : t('getTicket')}
                    </Link>
                  </Button>
                  {soldOut ? (
                    <span className="max-w-40 text-end text-[0.7rem] text-muted-foreground lg:max-w-none lg:text-center">
                      {t('fullWaitlist')}
                    </span>
                  ) : null}
                </div>
              )
            }
          />
          {ask ? <div className="mt-3 hidden lg:block">{ask}</div> : null}
        </aside>
      </div>
    </article>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm">{children}</dd>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-sans text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

async function DateRange({ start, end }: { start: Date; end: Date | null }) {
  const locale = (await getLocale()) as Locale;
  return (
    <>
      <time dateTime={start.toISOString()} className="block font-semibold">
        {formatDate(start, locale)}
      </time>
      <span className="ltr-nums text-muted-foreground">
        {formatTime(start, locale)}
        {end ? ` – ${formatTime(end, locale)}` : ''}
      </span>
    </>
  );
}

async function TimeOf({ date }: { date: Date }) {
  const locale = (await getLocale()) as Locale;
  return (
    <time
      dateTime={date.toISOString()}
      className="ltr-nums shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary"
    >
      {formatTime(date, locale)}
    </time>
  );
}

async function Brief({ event }: { event: EventDetailDto }) {
  const t = await getTranslations('Event');
  const { brief } = event;
  const items: [string, ReactNode][] = [];
  if (brief.whatToBring?.length) {
    items.push([
      t('whatToBring'),
      <ul key="bring" className="list-disc space-y-1 ps-5">
        {brief.whatToBring.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>,
    ]);
  }
  if (brief.dressCode) items.push([t('dressCode'), <p key="dress">{brief.dressCode}</p>]);
  if (brief.rules) items.push([t('rules'), <p key="rules">{brief.rules}</p>]);
  if (brief.safety) items.push([t('safety'), <p key="safety">{brief.safety}</p>]);
  if (items.length === 0) return null;
  return (
    <div lang={event.language} className="grid gap-3 sm:grid-cols-2">
      {items.map(([title, body]) => (
        <section
          key={title}
          className="rounded-2xl border border-border/70 bg-card p-4 text-sm leading-relaxed shadow-card"
        >
          <h2 className="mb-2 font-sans text-base font-semibold">{title}</h2>
          {body}
        </section>
      ))}
    </div>
  );
}
