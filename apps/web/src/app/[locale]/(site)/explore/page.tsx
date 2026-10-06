import { Compass, Search, X } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CategoryChip } from '@/components/doulisha/category-chip';
import { EmptyState } from '@/components/doulisha/empty-state';
import { EventCard } from '@/components/doulisha/event-card';
import { FiltersPanel } from '@/components/doulisha/filters-panel';
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
 * Explore (design system v2): title, search, category chips, then the filters
 * panel beside the results. Filters are URL parameters so results are
 * shareable and work without JavaScript.
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
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-highlight uppercase">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {query || city
              ? t('resultsFor', { query: [query, city].filter(Boolean).join(' · ') })
              : t('subtitle')}
          </p>
        </div>
        <form action={`/${locale}/explore`} role="search">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {city ? <input type="hidden" name="city" value={city} /> : null}
          <label className="flex max-w-2xl items-center gap-2 rounded-full border border-input bg-card ps-4 pe-1.5 shadow-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-4 focus-within:ring-ring/15">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{tNav('search')}</span>
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder={tNav('search')}
              className="h-12 w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/75"
            />
            <Button type="submit" size="sm" className="shrink-0">
              {t('searchButton')}
            </Button>
          </label>
        </form>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
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
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[17rem_1fr] lg:gap-8">
        <aside>
          <FiltersPanel
            title={t('filters')}
            activeCount={activeFilters}
            initiallyOpen={activeFilters > 0}
          >
            <form action={`/${locale}/explore`} className="space-y-5">
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
              <fieldset>
                <legend className="mb-1 text-sm font-medium">{t('forWhom')}</legend>
                <div className="grid grid-cols-2 gap-x-3 lg:grid-cols-1">
                  {AUDIENCE.map((a) => (
                    <label key={a} className="flex min-h-11 items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        name="for"
                        value={a}
                        defaultChecked={filters.audience.includes(a)}
                        className="size-5 rounded-md accent-[var(--primary)]"
                      />
                      {t(`audience.${a}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex min-h-11 items-center gap-2.5 border-t border-border/70 pt-4 text-sm">
                <input
                  type="checkbox"
                  name="available"
                  value="1"
                  defaultChecked={filters.available}
                  className="size-5 rounded-md accent-[var(--primary)]"
                />
                {t('availableOnly')}
              </label>
              <NearMeField initial={filters.near} />
              <div className="flex items-center gap-2 border-t border-border/70 pt-4">
                <Button asChild variant="ghost" className="flex-1">
                  <Link href="/explore">{t('reset')}</Link>
                </Button>
                <Button type="submit" className="flex-1" data-testid="apply-filters">
                  {t('apply')}
                </Button>
              </div>
            </form>
          </FiltersPanel>
        </aside>

        <section aria-labelledby="results" className="min-w-0">
          <h2 id="results" className="sr-only">
            {t('title')}
          </h2>
          <p className="mb-4 text-sm font-medium text-muted-foreground" aria-live="polite">
            {t('results', { count: events.length })}
          </p>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((event, i) => (
                <EventCard key={event.id} event={event} priority={i < 3} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Compass}
              title={tStates('emptyEventsTitle')}
              hint={tStates('emptyEventsHint')}
              action={
                query || city || category || activeFilters > 0 ? (
                  <Button asChild variant="outline">
                    <Link href="/explore">
                      <X className="size-4" aria-hidden="true" />
                      {t('clearSearch')}
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
