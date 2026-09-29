import type { Auth } from '@doulisha/auth';
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

/** Built once per request: database, session, roles and locale. */
export async function createContext({ db, auth, headers, deps }: CreateContextOptions) {
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

export type Context = Awaited<ReturnType<typeof createContext>>;
