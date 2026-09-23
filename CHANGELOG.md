# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
