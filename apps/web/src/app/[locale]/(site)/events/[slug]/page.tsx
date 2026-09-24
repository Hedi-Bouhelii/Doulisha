import type { EventDetailDto } from '@doulisha/api';
import { formatDate, formatTime, type Locale } from '@doulisha/i18n';
import { TRPCError } from '@trpc/server';
import { ArrowLeft, CalendarDays, MapPin, Ticket, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';

import { accentOf, CategoryIcon } from '@/components/doulisha/category-icon';
import { EmptyState } from '@/components/doulisha/empty-state';
import { FriendsGoing } from '@/components/doulisha/friends-going';
import { OrganizerCard } from '@/components/doulisha/organizer-card';
import { PlacesLeft } from '@/components/doulisha/places-left';
import { PriceTag } from '@/components/doulisha/price-tag';
import { StickyCTA } from '@/components/doulisha/sticky-cta';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
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

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/events/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);
  return {
    title: event.title,
    description: event.description?.slice(0, 160),
    openGraph: event.coverUrl ? { images: [event.coverUrl] } : undefined,
  };
}

/** Event page (DSC-03). Full SEO (JSON-LD, share images) and booking arrive in Phase 2. */
export default async function EventPage({ params }: PageProps<'/[locale]/events/[slug]'>) {
  await resolveLocale(params);
  const { slug } = await params;
  const event = await loadEvent(slug);
  const t = await getTranslations('Event');
  const tLang = await getTranslations('Languages');
  const accent = accentOf(event.category.accent);
  const isFree = event.registrationType === 'free_rsvp';

  return (
    <article className="pb-28 lg:pb-12">
      {/* Hero with the title over the photo (template). */}
      <header className="relative isolate flex min-h-[22rem] items-end overflow-hidden bg-foreground sm:min-h-[26rem]">
        {event.coverUrl ? (
          <Image
            src={event.coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-5xl items-center justify-between px-4 pt-4 sm:px-6">
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="size-11 rounded-full bg-card/90"
          >
            <Link href="/explore" aria-label={t('backToExplore')}>
              <ArrowLeft className="size-5 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <div className="mx-auto w-full max-w-5xl px-4 pb-6 text-white sm:px-6">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
              accent.tile,
            )}
          >
            <CategoryIcon name={event.category.icon} className="size-3.5" />
            {event.category.name}
          </span>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{event.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-white/90">
            <MapPin className="size-4" aria-hidden="true" />
            {[event.city, event.venueName].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
            <Fact icon={<CalendarDays className="size-5" />} label={t('date')}>
              <DateRange start={event.startsAt} end={event.endsAt} />
            </Fact>
            <Fact icon={<Ticket className="size-5" />} label={t('price')}>
              <PriceTag millimes={event.priceFromMillimes} />
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

          <Tabs defaultValue="about" className="mt-6">
            <TabsList className="h-11 w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="about" className="min-h-9 px-4">
                {t('about')}
              </TabsTrigger>
              <TabsTrigger value="details" className="min-h-9 px-4">
                {t('details')}
              </TabsTrigger>
              <TabsTrigger value="organizer" className="min-h-9 px-4">
                {t('organizer')}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="min-h-9 px-4">
                {t('reviews')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-4 space-y-6">
              {event.description ? (
                <p lang={event.language} className="text-base leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {t('writtenIn', { language: tLang(event.language) })}
                {event.minAge ? ` · ${t('minAge', { age: event.minAge })}` : ''}
              </p>
              <section>
                <h2 className="mb-3 font-sans text-lg font-semibold">{t('peopleGoing')}</h2>
                <FriendsGoing people={event.publicAttendees} count={event.placesTaken} />
              </section>
            </TabsContent>

            <TabsContent value="details" className="mt-4 space-y-6">
              <Brief event={event} />
              {event.meetingPoints.length > 0 ? (
                <Section title={t('meetingPoints')}>
                  <ul className="space-y-2">
                    {event.meetingPoints.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between gap-4 rounded-lg bg-muted px-3 py-2"
                      >
                        <span>{p.name}</span>
                        <TimeOf date={p.meetAt} />
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
              {event.programme.length > 0 ? (
                <Section title={t('programme')}>
                  <ol className="space-y-2 border-s-2 border-primary/30 ps-4">
                    {event.programme.map((step) => (
                      <li key={step.id} className="flex justify-between gap-4">
                        <span>{step.title}</span>
                        {step.startsAt ? <TimeOf date={step.startsAt} /> : null}
                      </li>
                    ))}
                  </ol>
                </Section>
              ) : null}
              <Section title={t('cancellationPolicy')}>
                <p className="text-muted-foreground">{t(`policy.${event.cancellationPolicy}`)}</p>
              </Section>
              {event.locationHidden ? (
                <p className="text-sm text-muted-foreground">{t('locationHidden')}</p>
              ) : event.address ? (
                <Section title={t('location')}>
                  <p>{event.address}</p>
                </Section>
              ) : null}
            </TabsContent>

            <TabsContent value="organizer" className="mt-4">
              {event.organizer ? <OrganizerCard organizer={event.organizer} /> : null}
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              <EmptyState title={t('reviews')} hint={t('noReviews')} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <StickyCTA
            summary={
              <>
                <PriceTag millimes={event.priceFromMillimes} className="block text-base" />
                <PlacesLeft capacity={event.capacity} left={event.placesLeft} className="text-xs" />
              </>
            }
            action={
              <div className="flex flex-col items-end gap-1 lg:items-stretch">
                <Button
                  size="lg"
                  disabled
                  aria-describedby="booking-soon"
                  className="min-h-11 rounded-full px-6"
                >
                  {isFree ? t('rsvp') : t('getTicket')}
                </Button>
                <span
                  id="booking-soon"
                  className="max-w-40 text-end text-[0.7rem] text-muted-foreground lg:max-w-none lg:text-center"
                >
                  {t('bookingSoon')}
                </span>
              </div>
            }
          />
        </aside>
      </div>
    </article>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-primary" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-sm">{children}</dd>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-sans text-base font-semibold">{title}</h2>
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
    <time dateTime={date.toISOString()} className="ltr-nums shrink-0 text-muted-foreground">
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
    <div lang={event.language} className="space-y-4">
      {items.map(([title, body]) => (
        <Section key={title} title={title}>
          {body}
        </Section>
      ))}
    </div>
  );
}
