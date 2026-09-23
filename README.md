# Doulisha (web)

The social platform for events and activities in Tunisia: discover what to do, organize anything from a mountain hike to a birthday, invite friends and book local providers.

This repository is the **web application**: the public site, event pages, guest RSVP, organizer dashboard and admin, plus the API. The mobile app will be a separate project ([ADR 0006](docs/decisions/0006-web-only-repository.md)).

- Specification: [`docs/cahier-des-charges-v2.pdf`](docs/cahier-des-charges-v2.pdf)
- Build plan: [`docs/BUILD_PROMPT.md`](docs/BUILD_PROMPT.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [decisions](docs/decisions/README.md)
- Open questions: [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md)

**Status:** Phase 0 (foundations) is done, and Neon is linked. See [`CHANGELOG.md`](CHANGELOG.md).

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
neon link --project-id delicate-brook-47760427 --branch production -y
```

`neon link` does two things:

- it writes `.neon`, which pins the project and branch;
- it writes the connection strings (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) to the root `.env.local`.

Both files are gitignored.

**The database must be `Doulisha`.** `neon link` writes URLs that point at the default `neondb` database. In `.env.local`, replace `/neondb?` with `/Doulisha?` in both URLs.

Other variables are listed in [`.env.example`](.env.example). Development uses mocks for SMS, payments and email, so no other credentials are needed.

### 4. Run

```sh
pnpm dev     # http://localhost:3000
```

### 5. Check before you push

```sh
pnpm check   # prettier check, ESLint, TypeScript, Vitest
pnpm build   # production build
```

CI (`.github/workflows/ci.yml`) runs the same steps on every pull request and on every push to `main`.

## Repository layout

```text
apps/
  web/        Next.js: public site, event pages, guest RSVP, organizer dashboard, /admin, tRPC API, webhooks
packages/
  config/     shared tsconfig and ESLint presets
  db/ api/ auth/ validators/ i18n/ ui-tokens/ templates/ payments/ notifications/
docs/         specification, build plan, architecture, ADRs, audit, open questions
.claude/      Claude Code skills shared by the team (Neon)
```

## Stack

- **Tooling:** pnpm workspaces and Turborepo, TypeScript (strict).
- **Web:** Next.js 16 with Tailwind CSS 4.
- **Database:** Neon Postgres 18.
- **Planned from Phase 1:**
  - data access: Drizzle;
  - API and auth: tRPC and Better Auth;
  - UI and i18n: shadcn/ui and next-intl.

The full stack and the reasons for each choice are in the [ADRs](docs/decisions/README.md).
