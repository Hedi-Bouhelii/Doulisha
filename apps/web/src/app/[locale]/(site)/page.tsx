import { ArrowRight, MapPin, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Suspense } from 'react';

import { CategoryTile } from '@/components/doulisha/category-tile';
import { EmptyState } from '@/components/doulisha/empty-state';
import { EventCard, EventCardSkeleton } from '@/components/doulisha/event-card';
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
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/70 rtl:bg-linear-to-l via-black/40 to-black/10" />
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-24 sm:px-6 sm:pt-20 sm:pb-32">
          <h1 className="max-w-xl text-5xl leading-[1.05] font-bold text-white sm:text-6xl">
            <span className="block">{t('heroLine1')}</span>
            <span className="block">{t('heroLine2')}</span>
            <span className="block">{t('heroLine3')}</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/90">{t('heroSubtitle')}</p>

          <form
            action={`/${locale}/explore`}
            role="search"
            className="mt-8 flex max-w-2xl items-center gap-1 rounded-full bg-card p-1.5 shadow-lg"
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
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Search className="size-5" aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>

      {/* Category tiles overlapping the hero edge (template). */}
      <section
        aria-labelledby="categories"
        className="relative z-10 mx-auto -mt-12 w-full max-w-7xl px-4 sm:px-6"
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

      <section aria-labelledby="trending" className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="trending" className="text-2xl font-bold sm:text-3xl">
            {t('trendingTitle')}
          </h2>
          <Link
            href="/explore"
            className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {t('seeAll')}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
        <Suspense fallback={<EventGridSkeleton />}>
          <TrendingEvents />
        </Suspense>
      </section>
    </>
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
