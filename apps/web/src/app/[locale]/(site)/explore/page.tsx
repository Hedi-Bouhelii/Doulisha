import { Compass, Home, Search, X } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CategoryChip } from '@/components/doulisha/category-chip';
import { EmptyState } from '@/components/doulisha/empty-state';
import { EventCard } from '@/components/doulisha/event-card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { api } from '@/trpc/server';
import { resolveLocale } from '@/i18n/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/explore'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'Explore' });
  return { title: t('title') };
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Explore (template): sidebar, search, category chips and an event grid.
 * Filters are URL parameters so results are shareable and work without JavaScript.
 */
export default async function ExplorePage({
  params,
  searchParams,
}: PageProps<'/[locale]/explore'>) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const category = one(sp.category)?.slice(0, 40) || undefined;
  const query = one(sp.q)?.trim().slice(0, 80) || undefined;
  const city = one(sp.city)?.trim().slice(0, 60) || undefined;

  const [t, tNav, tStates] = await Promise.all([
    getTranslations('Explore'),
    getTranslations('Nav'),
    getTranslations('States'),
  ]);
  const caller = await api();
  const [categories, events] = await Promise.all([
    caller.catalog.categories(),
    caller.events.upcoming({ limit: 48, categorySlug: category, query, city }),
  ]);

  const withFilters = (next: { category?: string }) => {
    const search = new URLSearchParams();
    if (next.category) search.set('category', next.category);
    if (query) search.set('q', query);
    if (city) search.set('city', city);
    const qs = search.toString();
    return qs ? `/explore?${qs}` : '/explore';
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[13rem_1fr]">
      <aside className="hidden lg:block">
        <nav aria-label={tNav('mainNavigation')} className="sticky top-24 flex flex-col gap-1">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-accent"
          >
            <Home className="size-4" aria-hidden="true" />
            {tNav('home')}
          </Link>
          <Link
            href="/explore"
            aria-current="page"
            className="flex min-h-11 items-center gap-3 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Compass className="size-4" aria-hidden="true" />
            {tNav('explore')}
          </Link>
        </nav>
      </aside>

      <div className="min-w-0">
        <form action={`/${locale}/explore`} role="search" className="mb-6">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {city ? <input type="hidden" name="city" value={city} /> : null}
          <label className="flex max-w-xl items-center gap-2 rounded-full border border-border bg-card px-4 shadow-sm">
            <Search className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{tNav('search')}</span>
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder={tNav('search')}
              className="h-11 w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
        </form>

        <h1 className="text-3xl font-bold sm:text-4xl">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">
          {query || city
            ? t('resultsFor', { query: [query, city].filter(Boolean).join(' · ') })
            : t('subtitle')}
        </p>

        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          <CategoryChip href={withFilters({})} label={t('all')} active={!category} />
          {categories.map((c) => (
            <CategoryChip
              key={c.slug}
              href={withFilters({ category: c.slug })}
              label={c.name}
              icon={c.icon}
              active={category === c.slug}
            />
          ))}
        </div>

        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {t('results', { count: events.length })}
        </p>

        {events.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event, i) => (
              <EventCard key={event.id} event={event} priority={i < 3} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-4"
            title={tStates('emptyEventsTitle')}
            hint={tStates('emptyEventsHint')}
            action={
              query || city || category ? (
                <Button asChild variant="outline" className="min-h-11">
                  <Link href="/explore">
                    <X className="size-4" aria-hidden="true" />
                    {t('clearSearch')}
                  </Link>
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
