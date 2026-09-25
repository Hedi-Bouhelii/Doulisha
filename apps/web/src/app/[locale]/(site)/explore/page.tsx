import { Compass, Home, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CategoryChip } from '@/components/doulisha/category-chip';
import { EmptyState } from '@/components/doulisha/empty-state';
import { EventCard } from '@/components/doulisha/event-card';
import { Field, NativeSelect } from '@/components/doulisha/form-field';
import { NearMeField } from '@/components/doulisha/near-me-field';
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

const WHEN = ['today', 'tonight', 'weekend', 'week', 'month'] as const;
const AUDIENCE = ['solo', 'couple', 'friends', 'family', 'kids'] as const;
type When = (typeof WHEN)[number];
type Audience = (typeof AUDIENCE)[number];

/** Reads the filter parameters (DSC-02); anything unknown is ignored. */
function readFilters(sp: Record<string, string | string[] | undefined>) {
  const when = WHEN.find((w) => w === one(sp.when)) as When | undefined;
  const priceParam = one(sp.price);
  const price = priceParam === 'free' || priceParam === 'paid' ? priceParam : undefined;
  const audience = [sp.for].flat().filter((a): a is Audience => AUDIENCE.includes(a as Audience));
  const available = one(sp.available) === '1';
  const lat = Number(one(sp.lat));
  const lng = Number(one(sp.lng));
  const near =
    one(sp.lat) && one(sp.lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  return { when, price, audience, available, near } as const;
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
  const filters = readFilters(sp);
  const activeFilters =
    Number(Boolean(filters.when)) +
    Number(Boolean(filters.price)) +
    filters.audience.length +
    Number(filters.available) +
    Number(filters.near !== null);

  const [t, tNav, tStates] = await Promise.all([
    getTranslations('Explore'),
    getTranslations('Nav'),
    getTranslations('States'),
  ]);
  const caller = await api();
  const [categories, events] = await Promise.all([
    caller.catalog.categories(),
    caller.events.upcoming({
      limit: 48,
      categorySlug: category,
      query,
      city,
      when: filters.when,
      price: filters.price,
      audience: filters.audience.length ? filters.audience : undefined,
      available: filters.available || undefined,
      near: filters.near ? { ...filters.near, radiusKm: 30 } : undefined,
    }),
  ]);

  /** Same filters, another category. */
  const withFilters = (next: { category?: string }) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (key === 'category' || value === undefined) continue;
      for (const v of [value].flat()) search.append(key, v);
    }
    if (next.category) search.set('category', next.category);
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

        <details
          open={activeFilters > 0}
          className="mt-4 rounded-xl border border-border bg-card"
          data-testid="explore-filters"
        >
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-semibold">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t('filters')}
            {activeFilters > 0 ? (
              <span className="ltr-nums rounded-full bg-primary px-2 text-xs text-primary-foreground">
                {activeFilters}
              </span>
            ) : null}
          </summary>
          <form
            action={`/${locale}/explore`}
            className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {query ? <input type="hidden" name="q" value={query} /> : null}
            {city ? <input type="hidden" name="city" value={city} /> : null}
            <Field id="f-when" label={t('when')}>
              <NativeSelect id="f-when" name="when" defaultValue={filters.when ?? ''}>
                <option value="">{t('whenAny')}</option>
                {WHEN.map((w) => (
                  <option key={w} value={w}>
                    {t(w)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="f-price" label={t('price')}>
              <NativeSelect id="f-price" name="price" defaultValue={filters.price ?? ''}>
                <option value="">{t('priceAny')}</option>
                <option value="free">{t('free')}</option>
                <option value="paid">{t('paid')}</option>
              </NativeSelect>
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium">{t('forWhom')}</legend>
              <div className="flex flex-wrap gap-x-4">
                {AUDIENCE.map((a) => (
                  <label key={a} className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="for"
                      value={a}
                      defaultChecked={filters.audience.includes(a)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {t(`audience.${a}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="available"
                value="1"
                defaultChecked={filters.available}
                className="size-4 accent-[var(--primary)]"
              />
              {t('availableOnly')}
            </label>
            <NearMeField initial={filters.near} />
            <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-2 lg:justify-end">
              <Button asChild variant="ghost" className="min-h-11">
                <Link href="/explore">{t('reset')}</Link>
              </Button>
              <Button
                type="submit"
                className="min-h-11 rounded-full px-6"
                data-testid="apply-filters"
              >
                {t('apply')}
              </Button>
            </div>
          </form>
        </details>

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
              query || city || category || activeFilters > 0 ? (
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
