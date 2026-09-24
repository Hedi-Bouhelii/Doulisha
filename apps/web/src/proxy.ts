import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

/**
 * Next 16 proxy (formerly middleware): redirects paths without a language
 * ("/", "/explore") to the visitor's language (cookie, then Accept-Language)
 * and keeps the locale prefix on every page.
 */
export default function proxy(request: NextRequest) {
  // Files in /public (images, icons) are served as they are.
  if (/\.[\w]+$/.test(request.nextUrl.pathname)) return;
  return intl(request);
}

export const config = {
  // Skip API routes and Next internals. Kept deliberately simple: a more complex
  // negative lookahead was not matched by Next 16's proxy matcher.
  matcher: ['/((?!api|_next|_vercel).*)'],
};
