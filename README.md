# Doulisha (web)

The social platform for events and activities in Tunisia: discover what to do, organize anything from a mountain hike to a birthday, invite friends and book local providers.

This repository is the **web application**: the public site, event pages, guest RSVP, organizer dashboard and admin, plus the API. The mobile app will be a separate project ([ADR 0006](docs/decisions/0006-web-only-repository.md)).

- Specification: [`docs/cahier-des-charges-v2.pdf`](docs/cahier-des-charges-v2.pdf)
- Build plan: [`docs/BUILD_PROMPT.md`](docs/BUILD_PROMPT.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [decisions](docs/decisions/README.md)
- Database: [`docs/DATABASE.md`](docs/DATABASE.md) · API: [`docs/API.md`](docs/API.md) · UI: [`docs/UX_GUIDELINES.md`](docs/UX_GUIDELINES.md)
- Open questions: [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md)

**Status:** Phase 1 (data, auth, i18n, design system) is done. See [`CHANGELOG.md`](CHANGELOG.md).

## Setup (under 10 minutes)

### 1. Prerequisites

- **Node.js 24** (see `.nvmrc`; 22.13 or later works).
- **pnpm 12:** `npm install -g pnpm@12` or `corepack enable`.
- **Neon CLI:** `npm install -g neon`.

### 2. Install

```sh
git clone <repo-url> doulisha
cd doulisha
pnpm install
```

### 3. Connect the database (Neon)

```sh
neon login
neon link --project-id delicate-brook-47760427 --branch dev -y
pnpm db:use-doulisha      # neon link points at "neondb"; our tables live in "Doulisha"
```

`neon link` writes `.neon` (project and branch) and the connection strings (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) to the root `.env.local`. Both files are gitignored. Work on the `dev` branch, never on `production`.

Then add an auth secret to `.env.local`:

```sh
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
```

Other variables are listed in [`.env.example`](.env.example). Development uses mocks for SMS, payments and email, so no other credentials are needed.

### 4. Database

```sh
pnpm db:migrate   # apply migrations (extensions + tables)
pnpm db:seed      # demo data in Arabic, French and English (wipes the branch first)
```

### 5. Run

```sh
pnpm dev          # http://localhost:3000 → redirects to /fr, /ar or /en
```

- **Sign in** at `/fr/sign-in` with any phone number. The code appears in the dev outbox at `/fr/dev/outbox` (nothing is really sent).
- **Admin:** sign in with `20 000 001` (the seeded admin) and open `/fr/admin` to browse the seed data.
- **Arabic:** use the language menu or open `/ar`; the layout flips to right-to-left.
- **Components:** `/fr/design` shows every base component and state (development only).

### 6. Check before you push

```sh
pnpm check   # prettier check, ESLint, TypeScript, Vitest
pnpm build   # production build
pnpm e2e     # Playwright (desktop + mobile) against the running app and the dev branch
```

First E2E run: `pnpm --filter @doulisha/web exec playwright install chromium`.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, a migration check and the build on every pull request; with the Neon secrets set it also runs the E2E suite on a fresh Neon branch ([DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Repository layout

```text
apps/
  web/        Next.js: public site, event pages, guest RSVP, organizer dashboard, /admin, tRPC API, webhooks
packages/
  config/     shared tsconfig and ESLint presets
  db/         Drizzle schema, migrations, seed
  api/        tRPC routers, services, permissions
  auth/       Better Auth configuration
  i18n/       ar/fr/en messages, TND and date formatters
  ui-tokens/  design tokens (colours, fonts, radii) and tokens.css
  templates/  category templates
  validators/ shared Zod schemas
  notifications/ SMS and email senders (mocks for now)
  payments/   payment providers (Phase 2)
docs/         specification, build plan, architecture, database, API, UX, ADRs, open questions
.claude/      Claude Code skills shared by the team (Neon)
```

## Stack

- **Tooling:** pnpm workspaces and Turborepo, TypeScript 6 (strict).
- **Web:** Next.js 16 (App Router, `proxy.ts`), Tailwind CSS 4, shadcn/ui, next-intl.
- **API and auth:** tRPC 11 with TanStack Query, Better Auth.
- **Data:** Neon Postgres 18 (PostGIS, pg_trgm), Drizzle ORM.
- **Tests:** Vitest, Playwright.

The full stack and the reasons for each choice are in the [ADRs](docs/decisions/README.md).
