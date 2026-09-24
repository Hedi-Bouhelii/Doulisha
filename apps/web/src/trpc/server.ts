import 'server-only';

import { createCaller, createContext } from '@doulisha/api';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { cache } from 'react';

import { getAuth } from '@/server/auth';
import { getDb } from '@/server/db';

/**
 * tRPC caller for React Server Components: same procedures, permissions and
 * error format as the HTTP API, without a network hop.
 */
export const api = cache(async () => {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set('x-doulisha-locale', await getLocale());
  const ctx = await createContext({ db: getDb(), auth: getAuth(), headers: requestHeaders });
  return createCaller(ctx);
});
