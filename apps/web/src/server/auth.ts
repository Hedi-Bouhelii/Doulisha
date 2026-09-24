import 'server-only';

import { createAuth, type Auth } from '@doulisha/auth';
import { mockEmailSender, mockSmsSender } from '@doulisha/notifications';
import { headers } from 'next/headers';
import { cache } from 'react';

import { configuredSocialProviders, getServerEnv } from '@/env';

import { getDb } from './db';

let auth: Auth | undefined;

/** Better Auth instance (ACC-01). SMS and email are mocks until Phase 6. */
export function getAuth(): Auth {
  if (auth) return auth;
  const env = getServerEnv();
  auth = createAuth({
    db: getDb(),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    sms: mockSmsSender,
    email: mockEmailSender,
    social: configuredSocialProviders(env),
    rateLimit: env.NODE_ENV === 'production',
  });
  return auth;
}

/**
 * The current session in server components, once per request. Reading the
 * headers first marks the page as dynamic before any secret is needed, so
 * builds without secrets (CI) never try to prerender signed-in pages.
 */
export const getSession = cache(async () => {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
});
