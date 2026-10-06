import {
  ArrowRight,
  CalendarPlus,
  MapPin,
  PartyPopper,
  QrCode,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { type ReactNode, Suspense } from 'react';

import { CategoryTile } from '@/components/doulisha/category-tile';
import { LeafSprig } from '@/components/doulisha/decor';
import { EmptyState } from '@/components/doulisha/empty-state';
import { EventCard, EventCardSkeleton } from '@/components/doulisha/event-card';
import { NearMeRail } from '@/components/doulisha/near-me';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { api } from '@/trpc/server';
import { resolveLocale } from '@/i18n/locale';

import heroImage from '../../../../public/images/hero.webp';

/** Categories shown as tiles; the rest are behind "More" (template: 5 tiles + More). */
const TILE_CATEGORIES = ['outdoor', 'sports', 'entertainment', 'learning', 'kids'];

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations('Home');
  const caller = await api();
  const [categories, cities] = await Promise.all([
    caller.catalog.categories(),
    caller.catalog.cities(),
  ]);
  const tiles = TILE_CATEGORIES.flatMap((slug) => categories.filter((c) => c.slug === slug));

  return (
    <>
      {/* Hero: photo of Tunis at sunset with the three-line headline (template). */}
      <section className="relative isolate overflow-hidden">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/75 via-black/45 to-black/5 rtl:bg-linear-to-l" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-linear-to-t from-black/40 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-28 sm:px-6 sm:pt-24 sm:pb-36">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur-sm">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-highlight" />
            {t('heroEyebrow')}
          </p>
          <h1 className="max-w-2xl text-5xl leading-[1.04] font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            <span className="block">{t('heroLine1')}</span>
            <span className="block">{t('heroLine2')}</span>
            <span className="block">{t('heroLine3')}</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/90">{t('heroSubtitle')}</p>

          <form
            action={`/${locale}/explore`}
            role="search"
            className="mt-8 flex max-w-2xl items-center gap-1 rounded-full border border-white/40 bg-card p-1.5 shadow-overlay"
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 ps-4">
              <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">{t('searchPlaceholder')}</span>
              <input
                name="q"
                type="search"
                placeholder={t('searchPlaceholder')}
                className="h-11 w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="hidden items-center gap-1.5 border-s border-border ps-3 sm:flex">
              <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">{t('searchCity')}</span>
              <select
                name="city"
                defaultValue=""
                className="h-11 max-w-40 bg-transparent pe-2 text-sm text-foreground outline-none"
              >
                <option value="">{t('anyCity')}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              aria-label={t('searchPlaceholder')}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-5"
            >
              <Search className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('searchButton')}</span>
            </button>
          </form>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/90">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-white" aria-hidden="true" />
              {t('trustSecure')}
            </li>
            <li className="flex items-center gap-2">
              <Wallet className="size-4 text-white" aria-hidden="true" />
              {t('trustPayments')}
            </li>
            <li className="flex items-center gap-2">
              <QrCode className="size-4 text-white" aria-hidden="true" />
              {t('trustTickets')}
            </li>
          </ul>
        </div>
      </section>

      {/* Category tiles overlapping the hero edge (template). */}
      <section
        aria-labelledby="categories"
        className="relative z-10 mx-auto -mt-14 w-full max-w-7xl px-4 sm:px-6"
      >
        <h2 id="categories" className="sr-only">
          {t('categoriesTitle')}
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {tiles.map((c) => (
            <CategoryTile
              key={c.slug}
              href={`/explore?category=${c.slug}`}
              label={c.name}
              icon={c.icon}
              accent={c.accent}
            />
          ))}
          <CategoryTile href="/explore" label={t('more')} />
        </div>
      </section>

      <section aria-labelledby="trending" className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-highlight uppercase">
              {t('trendingEyebrow')}
            </p>
            <h2 id="trending" className="mt-1 text-2xl font-bold sm:text-3xl">
              {t('trendingTitle')}
            </h2>
          </div>
          <SeeAll href="/explore" />
        </div>
        <Suspense fallback={<EventGridSkeleton />}>
          <TrendingEvents />
        </Suspense>
      </section>

      <Rail id="tonight" title={t('tonight')} href="/explore?when=tonight">
        <Suspense fallback={<EventGridSkeleton />}>
          <WhenEvents when="tonight" empty={t('nothingTonight')} />
        </Suspense>
      </Rail>

      <Rail id="weekend" title={t('weekend')} href="/explore?when=weekend">
        <Suspense fallback={<EventGridSkeleton />}>
          <WhenEvents when="weekend" />
        </Suspense>
      </Rail>

      <Rail id="near-me" title={t('nearMe')}>
        <NearMeRail />
      </Rail>

      {/* Organize: public event (organizer wizard) or private invitation (INV-01). */}
      <section aria-labelledby="organize" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6">
        <div className="relative isolate flex flex-col gap-6 overflow-hidden rounded-3xl border border-border/70 bg-secondary/60 p-6 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <LeafSprig className="pointer-events-none absolute -bottom-4 end-4 -z-10 h-36 opacity-70 sm:h-44" />
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-highlight uppercase">
              {t('organizeEyebrow')}
            </p>
            <h2 id="organize" className="mt-1 text-2xl font-bold sm:text-3xl">
              {t('organizeTitle')}
            </h2>
            <p className="mt-2 leading-relaxed text-secondary-foreground/80">{t('organizeHint')}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button asChild size="lg">
              <Link href="/organizer/events/new">
                <CalendarPlus aria-hidden="true" />
                {t('organizePublic')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/host/new">
                <PartyPopper aria-hidden="true" />
                {t('organizePrivate')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Rail({
  id,
  title,
  href,
  children,
}: {
  id: string;
  title: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 id={id} className="text-2xl font-bold sm:text-3xl">
          {title}
        </h2>
        {href ? <SeeAll href={href} /> : null}
      </div>
      {children}
    </section>
  );
}

async function SeeAll({ href }: { href: string }) {
  const t = await getTranslations('Home');
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
    >
      {t('seeAll')}
      <ArrowRight
        className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

/** Tonight / this weekend rails (DSC-04), in Tunisia time. */
async function WhenEvents({ when, empty }: { when: 'tonight' | 'weekend'; empty?: string }) {
  const tStates = await getTranslations('States');
  const events = await (await api()).events.upcoming({ limit: 4, when });
  if (events.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-sm text-muted-foreground">
        {empty ?? tStates('emptyEventsHint')}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

async function TrendingEvents() {
  const t = await getTranslations('States');
  const events = await (await api()).events.upcoming({ limit: 8 });
  if (events.length === 0) {
    return <EmptyState title={t('emptyEventsTitle')} hint={t('emptyEventsHint')} />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {events.map((event, i) => (
        <EventCard key={event.id} event={event} priority={i < 2} />
      ))}
    </div>
  );
}

function EventGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
