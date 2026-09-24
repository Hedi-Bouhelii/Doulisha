# API

The Doulisha API is **tRPC** (`packages/api`), served by the Next.js app at `/api/trpc` (ADR 0003). Server components call the same procedures in process through `api()` in `apps/web/src/trpc/server.ts`; client components use `useTRPC()` with TanStack Query.

## Conventions

- **Layering:** router (input validation, thin) → service (business rules, permissions) → Drizzle.
- **Transformer:** superjson (dates arrive as `Date`).
- **Locale:** clients send `x-doulisha-locale: ar | fr | en`; services return names in that language.
- **Auth context:** `ctx.session` (Better Auth) and `ctx.actor` `{ userId, roles, isAnonymous }`.
- **Procedures:** `publicProcedure`, `protectedProcedure` (signed-in members; guests refused), `roleProcedure(...roles)` (admins pass every role check).

## Error format

Services throw `AppError(code, messageKey, details?)`; the formatter returns:

```json
{
  "message": "errors.forbidden",
  "code": -32603,
  "data": {
    "code": "FORBIDDEN",
    "httpStatus": 403,
    "path": "admin.tables",
    "fieldErrors": { "limit": ["Too big"] },
    "details": {}
  }
}
```

- `message` is a key in the `Errors` messages of `@doulisha/i18n` (clients translate it). Unexpected errors always read `errors.internal`; internals are never leaked.
- `fieldErrors` lists invalid input fields (Zod).

## Routers and procedures

| Procedure            | Type  | Access | Description                                                                                                                                                                                           |
| -------------------- | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health.ping`        | query | public | Liveness check; returns `{ ok, time }`.                                                                                                                                                               |
| `me.get`             | query | public | The signed-in user with roles, or `null`. Guests have `isAnonymous: true`.                                                                                                                            |
| `catalog.categories` | query | public | Active categories in display order, localized.                                                                                                                                                        |
| `catalog.cities`     | query | public | Cities with upcoming public events (search city picker).                                                                                                                                              |
| `events.upcoming`    | query | public | Upcoming public events, soonest first. Input: `limit` (1–50), `categorySlug?`, `query?` (title or city, accent-insensitive), `city?`. Never returns private, unlisted, draft, deleted or past events. |
| `events.bySlug`      | query | public | One event page. Public and unlisted events only; private events and drafts return `NOT_FOUND` (TRS-06).                                                                                               |
| `admin.tables`       | query | admin  | Row counts of the tables the data explorer may show.                                                                                                                                                  |
| `admin.rows`         | query | admin  | Latest rows of one table (`table`, `limit` 1–200). Secrets (sessions, accounts, auth tokens) and sensitive data are never exposed.                                                                    |

## Other HTTP endpoints

| Endpoint          | Description                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/*`     | Better Auth: `phone-number/send-otp`, `phone-number/verify`, `sign-in/magic-link`, `magic-link/verify`, `sign-in/social`, `sign-in/anonymous`, `get-session`, `sign-out`… |
| `/api/dev/outbox` | Development only (404 in production): mock SMS and emails. `GET` lists, `DELETE` clears.                                                                                  |

Payment webhooks and Open Graph images arrive in Phase 2 and Phase 6.
