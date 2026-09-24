# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added: Phase 1, data, auth, i18n and design system (2026-09-24)

- **Database (`packages/db`):**
  - Drizzle schema for the 41 MVP tables (identity and social, event engine, commerce), UUID v7 ids from Postgres 18, geography points, trigram search index.
  - Migrations: extensions (`postgis`, `pg_trgm`, `unaccent`, `immutable_unaccent`) and the initial schema, applied to the new Neon `dev` branch.
  - Tunisian seed data: organizers, members, 13 events (including a past event, a draft and a private birthday), orders in every payment state.
- **Templates:** category and template catalogue (spec 6.2) with Zod validation of `events.details`.
- **Auth (`packages/auth`):** Better Auth with phone OTP sign-up, email magic link, optional Google, Facebook and Apple, guest sessions, roles, profile creation; mock SMS and email with a dev outbox.
- **API (`packages/api`):** tRPC context, public/protected/role procedures, one error format, permission helpers, and procedures for health, me, categories, cities, upcoming events, event page and the admin data explorer.
- **i18n:** Arabic, French and English messages, `/ar`, `/fr`, `/en` routing with RTL for Arabic, TND and Africa/Tunis formatters.
- **Design system:** tokens from the founder's UI template (palette, Playfair Display + Inter, Amiri + IBM Plex Sans Arabic), light and dark themes, WCAG AA tests, shadcn/ui made RTL-safe, and the base components.
- **Web app:** home, explore, event page, sign-in, admin data explorer, dev outbox and component gallery, following the template.
- **Tests:** unit tests for formatters, validators, templates, tokens, permissions and listing rules; Playwright E2E for the Phase 1 acceptance on desktop and mobile.
- **CI:** migration check, build without secrets, E2E on a Neon branch per pull request (enabled once secrets exist).
- **Docs:** DATABASE, API, UX_GUIDELINES, DEPLOYMENT, ADRs 0007–0010, open questions Q11–Q13.

### Changed: web-only repository and Neon link (2026-09-24)

- **Mobile removed:** this repository is now the web application only (ADR 0006).
  - Removed `apps/mobile` and the Expo ESLint preset.
  - The mobile app will be a separate project.
- **pnpm layout:** back to the default isolated `node_modules` layout (`nodeLinker: hoisted` is no longer needed).
- **Neon linked:** project `Doulisha` (`delicate-brook-47760427`), branch `production`, database `Doulisha`.
  - Connection strings are in the root `.env.local`, which is gitignored.
  - Neon agent skills are committed in `.claude/skills/`.
- **Documentation:**
  - Updated `README.md`, `CLAUDE.md` and `docs/ARCHITECTURE.md`.
  - Recorded the decisions on Q1, Q2, Q3 and Q7 in `docs/OPEN_QUESTIONS.md`.
  - Decided Q9 (keep aws-us-east-2, with Vercel functions in `cle1`) and Q10 (self-managed Better Auth).

### Added: Phase 0, audit and foundations (2026-09-23)

- **Monorepo:** pnpm 12 workspaces with a version catalog, and Turborepo tasks for `dev`, `build`, `lint`, `typecheck` and `test`.
- **`packages/config`:**
  - strict tsconfig bases (`base`, `library`, `nextjs`);
  - ESLint 9 flat presets (`base`, `next`, `expo`) with type-aware rules, no `any`, and a description required on every disable comment;
  - Prettier.
- **`apps/web`:** Next.js 16 with Tailwind CSS 4, a Zod-validated `env.ts`, and a placeholder home page in French.
- **`apps/mobile`:** Expo SDK 57 with Expo Router.
  - A minimal placeholder screen.
  - The app ID `tn.doulisha.app` and the `doulisha://` deep-link scheme.
- **Empty packages:** `db`, `api`, `auth`, `validators`, `ui-tokens`, `templates`, `payments` and `notifications`.
- **`packages/i18n`:** locale list (`ar`, `fr`, `en`), a default locale, and RTL detection, with tests.
- **CI:** a GitHub Actions workflow that runs format check, lint, typecheck, test and build.
- **Documentation:**
  - `README.md` and `CLAUDE.md`;
  - `docs/ARCHITECTURE.md`, with Mermaid diagrams;
  - `docs/AUDIT.md` and `docs/OPEN_QUESTIONS.md`;
  - ADRs 0001 to 0005;
  - `.env.example`.
