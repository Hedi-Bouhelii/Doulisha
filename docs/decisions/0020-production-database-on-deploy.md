# 0020. The production database migrates itself on each production deploy

- Status: Accepted (founder decision on OPEN_QUESTIONS Q26, 2026-09-29)
- Date: 2026-09-29

## Context

The live site (`https://doulisha.vercel.app`) ran on the Neon `dev` branch, shared with local work and E2E tests, because the `production` branch had no tables: migrations had only ever been applied to `dev`, and the project rule is never to migrate or seed `production` by hand. A fresh production database also lacks the categories and templates needed to create any event, and has no admin to open the back office.

## Decision

- **`pnpm --filter @doulisha/db db:deploy`** runs at the start of the web app's `build` script. When `VERCEL_ENV` is `production` it applies the committed migrations (with `DATABASE_URL_UNPOOLED`), then adds any missing categories and templates (`ensureReferenceData`). Anywhere else (local builds, CI, Vercel previews) it exits at once, so nobody migrates production by hand.
- **Reference data is added, never overwritten:** existing categories and templates keep admin edits. The seed uses the same function after wiping, so demo and production data start from the same definitions.
- **No demo data in production.** The seed still refuses the `production` branch.
- **First admin:** `ADMIN_EMAILS` (comma-separated) gives the admin role to those addresses when they sign in, only if the address is verified (Google, or an email code). Facebook addresses are never verified (ADR 0019), so they cannot become admins this way.
- Vercel **Production** variables point at the `production` branch of the `Doulisha` database; **Preview** variables keep pointing at `dev`.

## Consequences

- A migration that fails stops the production build, so a deployment never runs against a schema it does not expect.
- Migrations must stay backward compatible for the minutes between the migration and the new code going live (add columns before using them; remove them in a later release).
- Turborepo's build cache: a build with unchanged inputs is skipped, and so is its `db:deploy`. That is harmless, since nothing new would be applied; any new migration changes the inputs.
- Accounts and events created on the live site while it used `dev` stay in `dev`.
