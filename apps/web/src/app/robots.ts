import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site';

/** Personal and management pages stay out of search engines; so do API routes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/*/tickets',
        '/*/checkout',
        '/*/organizer',
        '/*/host',
        '/*/invite',
        '/*/admin',
        '/*/sign-in',
        '/*/dev',
        '/*/events/*/book',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
