# Deployment

> Status: Phase 2. Production deployment (Vercel) is set up in Phase 6; this page lists what exists so far.

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

## Vercel (Phase 6)

- Function region `cle1` (Cleveland), next to the Neon database (OPEN_QUESTIONS Q9).
- Environment variables: see `.env.example`. `SMS_PROVIDER`, `EMAIL_PROVIDER` and `PAYMENT_PROVIDER` stay `mock` until real providers are added.
- **Before the first deployment:** add the R2 storage provider. The local disk provider (`STORAGE_PROVIDER=local`) does not survive serverless deployments (OPEN_QUESTIONS Q19).
- `NEXT_PUBLIC_APP_URL` must be the public origin: it builds share links, `sitemap.xml`, canonical URLs and share-image URLs.
- The mock payment page (`/checkout/mock-pay`) returns 404 in production.
- Auth rate limiting turns on automatically in production (in-memory; a shared store is needed with several instances).
