import 'server-only';

import { createCaller, createContext } from '@doulisha/api';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { cache } from 'react';

import { getAuth } from '@/server/auth';
import { getDb } from '@/server/db';
import { getServiceDeps } from '@/server/deps';

/**
 * tRPC caller for React Server Components: same procedures, permissions and
 * error format as the HTTP API, without a network hop.
 */
export const api = cache(async () => {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set('x-doulisha-locale', await getLocale());
  const ctx = await createContext({
    db: getDb(),
    auth: getAuth(),
    headers: requestHeaders,
    deps: getServiceDeps(),
  });
  return createCaller(ctx);
});

/**
 * Caller for route handlers, where the locale comes from the request (query
 * string) rather than from the page's `[locale]` segment.
 */
export async function apiForLocale(locale: 'ar' | 'fr' | 'en') {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set('x-doulisha-locale', locale);
  const ctx = await createContext({
    db: getDb(),
    auth: getAuth(),
    headers: requestHeaders,
    deps: getServiceDeps(),
  });
  return createCaller(ctx);
}
