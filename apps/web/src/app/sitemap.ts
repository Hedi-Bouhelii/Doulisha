import { defaultLocale, locales } from '@doulisha/i18n';
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

import { absoluteUrl } from '@/lib/site';
import { apiForLocale } from '@/trpc/server';

const pages = ['', '/explore', '/terms', '/privacy'];

function entry(path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(`/${defaultLocale}${path}`),
    lastModified,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, absoluteUrl(`/${l}${path}`)])),
    },
  };
}

/** Public pages and public upcoming events only: private and unlisted events are never listed (TRS-06). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Read the request first so a build without database secrets stays dynamic.
  await headers();
  const events = await (await apiForLocale(defaultLocale)).events.sitemap();
  return [
    ...pages.map((path) => entry(path)),
    ...events.map((event) => entry(`/events/${event.slug}`, event.updatedAt)),
  ];
}
