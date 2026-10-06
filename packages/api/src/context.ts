import type { Auth, AuthSession } from '@doulisha/auth';
import { getUserRoles } from '@doulisha/auth';
import type { HttpDb } from '@doulisha/db';
import { defaultLocale, isLocale, type Locale } from '@doulisha/i18n';

import type { ServiceDeps } from './deps';
import type { Actor } from './permissions';

export interface CreateContextOptions {
  db: HttpDb;
  auth: Auth;
  headers: Headers;
  deps: ServiceDeps;
}

/** The locale the client is showing, sent in the `x-doulisha-locale` header. */
function readLocale(headers: Headers): Locale {
  const value = headers.get('x-doulisha-locale') ?? '';
  return isLocale(value) ? value : defaultLocale;
}

/**
 * Named explicitly so the router declarations refer to it instead of
 * repeating the whole Better Auth and Drizzle types (ADR 0024).
 */
export interface Context {
  db: HttpDb;
  auth: Auth;
  session: AuthSession | null;
  actor: Actor | null;
  locale: Locale;
  deps: ServiceDeps;
  headers: Headers;
}

/** Built once per request: database, session, roles and locale. */
export async function createContext({
  db,
  auth,
  headers,
  deps,
}: CreateContextOptions): Promise<Context> {
  const session = await auth.api.getSession({ headers });
  const actor: Actor | null = session
    ? {
        userId: session.user.id,
        roles: await getUserRoles(db, session.user.id),
        isAnonymous: session.user.isAnonymous === true,
      }
    : null;
  return { db, auth, session, actor, locale: readLocale(headers), deps, headers };
}
