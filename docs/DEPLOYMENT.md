# Deployment

> Status: a test deployment runs on Vercel since 2026-09-29 (below). The production set-up (real providers, storage, production database) comes in Phase 6.

## Neon

- Project `Doulisha` (`delicate-brook-47760427`), region aws-us-east-2, Postgres 18, database `Doulisha`.
- Branches: `production` (default), `dev` (local development), `preview/pr-<n>` (CI, one per pull request).
- Migrations are applied with `pnpm db:migrate` using `DATABASE_URL_UNPOOLED`. Never `drizzle-kit push` on production.

## GitHub (once the repository exists)

Repository settings → Secrets and variables → Actions:

| Name                    | Kind     | Value                                                           |
| ----------------------- | -------- | --------------------------------------------------------------- |
| `NEON_PROJECT_ID`       | variable | `delicate-brook-47760427`                                       |
| `NEON_API_KEY`          | secret   | A Neon API key limited to this project (`neon api-keys create`) |
| `BETTER_AUTH_SECRET_CI` | secret   | Any random 32+ character string (`openssl rand -base64 32`)     |

With these set, `.github/workflows/ci.yml` creates a Neon branch per pull request, migrates and seeds it, and runs the Playwright suite; `neon-cleanup.yml` deletes the branch when the pull request closes. Without them, the E2E job is skipped and only lint, typecheck, tests, migration check and build run.

## Current deployment (2026-09-29)

- `main` deploys to `https://doulisha.vercel.app` (free Vercel plan). Every merge into `main` redeploys.
- Variables set on Vercel: `NEXT_PUBLIC_APP_URL=https://doulisha.vercel.app`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `BETTER_AUTH_SECRET`, `ADMIN_EMAILS`, and the Google and Facebook keys. `NEXT_PUBLIC_APP_URL` is baked in at build time: redeploy after changing it.
- **Database (ADR 0020):** the **Production** variables point at the Neon `production` branch (database `Doulisha`, `NEON_BRANCH=production`); **Preview** variables keep `dev`. Each production build runs `db:deploy` first: migrations, then missing categories and templates. No demo data in production.
- **First admin:** `ADMIN_EMAILS=bouhelii.hedi@gmail.com` makes that account an admin at its next sign-in with Google or an email code.
- Google and Facebook sign-in (ADR 0019): the redirect addresses are `https://doulisha.vercel.app/api/auth/callback/google` and `…/callback/facebook`, never with a language prefix. How the founder set up both apps: [SOCIAL_SIGN_IN_SETUP.md](SOCIAL_SIGN_IN_SETUP.md).
- Not working on the live site yet, by design until Phase 6: SMS and email codes (mock senders; the dev outbox returns 404 in production), uploads (local disk), and online card payment (mock page returns 404).

## Vercel (Phase 6)

- Function region `cle1` (Cleveland), next to the Neon database (OPEN_QUESTIONS Q9).
- Environment variables: see `.env.example`. `SMS_PROVIDER`, `EMAIL_PROVIDER` and `PAYMENT_PROVIDER` stay `mock` until real providers are added.
- Turborepo runs in strict mode: a variable reaches `next build` only if it is listed in the `env` of the `build` task in `turbo.json`. When you add a variable to `env.ts` and `.env.example`, add it there too, or the Vercel build fails with "Invalid environment variables".
- **Before the first deployment:** add the R2 storage provider. The local disk provider (`STORAGE_PROVIDER=local`) does not survive serverless deployments (OPEN_QUESTIONS Q19).
- `NEXT_PUBLIC_APP_URL` must be the public origin: it builds share links, `sitemap.xml`, canonical URLs and share-image URLs.
- The mock payment page (`/checkout/mock-pay`) returns 404 in production.
- Auth rate limiting turns on automatically in production (in-memory; a shared store is needed with several instances).
