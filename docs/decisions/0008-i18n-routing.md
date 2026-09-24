# 0008. Locale routing with next-intl, the Next 16 proxy and next/root-params

- Status: Accepted
- Date: 2026-09-24

## Context

The web app speaks Arabic (RTL), French and English (spec section 8). Event pages must be indexable per language, and guests arrive from WhatsApp links in any language.

## Decision

- Every page lives under a locale prefix: `/ar`, `/fr`, `/en` (`localePrefix: 'always'`), with `app/[locale]/layout.tsx` as the **root layout** (it sets `<html lang dir>`). There is no `app/layout.tsx`: with one, `[locale]` stops being a root parameter.
- `src/proxy.ts` (Next 16's replacement for `middleware.ts`) runs next-intl's middleware: paths without a locale are redirected to the visitor's language (cookie, then `Accept-Language`, then French). Its matcher is deliberately simple, `'/((?!api|_next|_vercel).*)'`, and files are skipped in code: the usual negative lookahead with `.*\\..*` was not matched by Next 16's proxy matcher.
- next-intl reads the locale from **`next/root-params`** in `src/i18n/request.ts` (explicit locale first, then the root segment, then the proxy header). `setRequestLocale` is not used: it is deprecated in next-intl 4 and did not apply to pages served from the prerender cache.
- Messages are plain JSON in `packages/i18n/messages/{ar,fr,en}.json` (ICU format), framework-free for the future mobile app. English is the reference; a test enforces identical keys.
- French is the fallback locale (OPEN_QUESTIONS Q4).

## Consequences

- One URL per language: good for SEO and for sharing (`/ar/events/...`).
- Route handlers cannot use `next/root-params`; the API receives the locale in the `x-doulisha-locale` header.
- Arabic copy needs native review (OPEN_QUESTIONS Q11).
