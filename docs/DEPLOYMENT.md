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

## Cloudinary set-up (images, ADR 0026)

The founder does this once. Never commit the values.

1. Create a free account on cloudinary.com. In the console, open the API keys page and copy the **cloud name**, the **API key** and the **API secret**.
2. Vercel → the project → Settings → Environment Variables:

   | Name                                | Production      | Preview        | Note                       |
   | ----------------------------------- | --------------- | -------------- | -------------------------- |
   | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | cloud name      | cloud name     | public                     |
   | `NEXT_PUBLIC_CLOUDINARY_API_KEY`    | API key         | API key        | public                     |
   | `CLOUDINARY_API_SECRET`             | API secret      | API secret     | mark it **Sensitive**      |
   | `CLOUDINARY_UPLOAD_FOLDER`          | `doulisha/prod` | `doulisha/dev` | one folder per environment |

3. Redeploy: the `NEXT_PUBLIC_` values are baked in at build time.
4. Local work: add the same four lines to the root `.env.local`, with `CLOUDINARY_UPLOAD_FOLDER=doulisha/dev`, then restart `pnpm dev`.
5. In the Cloudinary console, set a usage notification at 70 % of the monthly credits (MED-07).
6. Do not create an unsigned upload preset: the app signs every upload (spec 2.2).

Without the three keys the app stores files on local disk, which works on a laptop but not on Vercel. Setting only some of the keys stops the app with an error naming the missing ones.

## Move the live site to the production database (Q26, ADR 0020)

**Done on 2026-11-27.** The Production variables on Vercel point at the Neon `production` branch, `ADMIN_EMAILS` is set for Production, and the founder's Google account has the admin role there. Accounts and events created on the live site before that date stay in `dev`. If `/admin` says "admins only" after a Google sign-in, check that `ADMIN_EMAILS` is set for the **Production** environment, redeploy, then sign out and in again: the role is given at sign-in.

The steps below are kept for reference (and to undo).

1. Get the two connection strings of the `production` branch (database `Doulisha`, role `neondb_owner`):

   ```sh
   neon connection-string production --database-name Doulisha --role-name neondb_owner --pooled   # DATABASE_URL
   neon connection-string production --database-name Doulisha --role-name neondb_owner            # DATABASE_URL_UNPOOLED
   ```

   Or in the Neon console: branch `production` → Connect → database `Doulisha`, once with connection pooling on and once with it off.

2. Vercel → Settings → Environment Variables, for **Production only** (Preview stays on `dev`):
   - `DATABASE_URL` = the pooled string
   - `DATABASE_URL_UNPOOLED` = the direct string
   - `NEON_BRANCH` = `production`
3. Redeploy the latest Production deployment. The build runs `db:deploy` first; its log ends with `db:deploy: migrations applied, reference data added (… categories, … templates) on branch production.`
4. Check the live site: Explore shows no events, and signing in with Google using an `ADMIN_EMAILS` address opens `/admin`.
5. Create the founder's organizer profile and the real events again: accounts, events and bookings made on the live site so far stay in `dev`.

To undo, put the `dev` values back and redeploy. Do this before inviting any real organizer, so nobody's data is left behind in `dev`.

## Vercel (Phase 6)

- Function region `cle1` (Cleveland), next to the Neon database (OPEN_QUESTIONS Q9).
- Environment variables: see `.env.example`. `SMS_PROVIDER`, `EMAIL_PROVIDER` and `PAYMENT_PROVIDER` stay `mock` until real providers are added.
- Turborepo runs in strict mode: a variable reaches `next build` only if it is listed in the `env` of the `build` task in `turbo.json`. When you add a variable to `env.ts` and `.env.example`, add it there too, or the Vercel build fails with "Invalid environment variables".
- **Files:** set the Cloudinary variables (above). The local disk provider does not survive serverless deployments (OPEN_QUESTIONS Q19, ADR 0026).
- `NEXT_PUBLIC_APP_URL` must be the public origin: it builds share links, `sitemap.xml`, canonical URLs and share-image URLs.
- The mock payment page (`/checkout/mock-pay`) returns 404 in production.
- Auth rate limiting turns on automatically in production (in-memory; a shared store is needed with several instances).
