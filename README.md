# Doulisha

The social platform for events and activities in Tunisia: discover what to do, organize anything from a mountain hike to a birthday, invite friends and book local providers.

- Specification: [`docs/cahier-des-charges-v2.pdf`](docs/cahier-des-charges-v2.pdf)
- Build plan: [`docs/BUILD_PROMPT.md`](docs/BUILD_PROMPT.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [decisions](docs/decisions/README.md)
- Open questions: [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md)

**Status:** Phase 0 (foundations). See [`CHANGELOG.md`](CHANGELOG.md).

## Setup (under 10 minutes)

### 1. Prerequisites

- **Node.js 24** (see `.nvmrc`; 22.13 or later works).
- **pnpm 12:** `npm install -g pnpm@12` or `corepack enable`.
- For the mobile app, one of:
  - [Expo Go](https://expo.dev/go) on an Android phone;
  - an Android emulator (Android Studio).

### 2. Install

```sh
git clone <repo-url> doulisha
cd doulisha
pnpm install
cp .env.example apps/web/.env.local   # defaults work for local development
```

### 3. Run

```sh
pnpm dev
```

- **Web:** http://localhost:3000
- **Mobile:** the Expo dev server starts on port 8081. To open the app on Android, use either:
  - Expo Go: scan the QR code shown in the `@doulisha/mobile` task;
  - the emulator: run `pnpm --filter @doulisha/mobile android`.

To run a single app, use `pnpm --filter @doulisha/web dev` or `pnpm --filter @doulisha/mobile dev`.

### 4. Check before you push

```sh
pnpm check   # prettier check, ESLint, TypeScript, Vitest
pnpm build   # production build of the web app
```

CI (`.github/workflows/ci.yml`) runs the same steps on every pull request and on every push to `main`.

## Repository layout

```
apps/
  web/        Next.js: public site, event pages, guest RSVP, organizer dashboard, /admin, tRPC server
  mobile/     Expo app (Android first)
packages/
  config/     shared tsconfig and ESLint presets
  db/ api/ auth/ validators/ i18n/ ui-tokens/ templates/ payments/ notifications/
docs/         specification, build plan, architecture, ADRs, audit, open questions
```

## Stack

- **Tooling:** pnpm workspaces and Turborepo, TypeScript (strict).
- **Web:** Next.js 16 with Tailwind CSS 4.
- **Mobile:** Expo SDK 57 with Expo Router.
- **Planned from Phase 1:**
  - data: Neon Postgres with Drizzle;
  - API and auth: tRPC and Better Auth;
  - UI and i18n: shadcn/ui, NativeWind, next-intl and i18next.

The full stack and the reasons for each choice are in [ADRs](docs/decisions/README.md).
