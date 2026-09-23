# 0001. Monorepo with pnpm workspaces and Turborepo

- Status: Accepted
- Date: 2026-09-23

## Context

Doulisha has a web app (Next.js), a mobile app (Expo) and one API, built by a small team. The specification (section 9) asks for one TypeScript codebase end to end. Web, mobile and server must share Zod schemas, types, translations and design tokens.

## Decision

- **Repository:** one repository managed with **pnpm workspaces** (`apps/*`, `packages/*`), with **Turborepo** running and caching tasks (`lint`, `typecheck`, `test`, `build`, `dev`).
- **Shared versions:** dependency versions shared across packages live in the pnpm **catalog** in `pnpm-workspace.yaml`, referenced as `"typescript": "catalog:"`.
- **Source-only internal packages:** each `@doulisha/*` package's `exports` points at `src/index.ts`, and each app compiles them (`transpilePackages` in Next.js, Metro for Expo). No package has a build step, so there are no build outputs to keep in sync.
- **`nodeLinker: hoisted`:** Expo supports isolated installs since SDK 54, but its docs warn that some React Native libraries still break with them. Our stack (NativeWind, Reanimated, bottom sheets, FlashList) includes several of those libraries. We can revisit this once the mobile stack is stable.
- **Supply-chain protections stay on:** pnpm's install-script allow list (`allowBuilds`) and its minimum release age. Each package is allowed or refused explicitly in `pnpm-workspace.yaml`.

## Consequences

- **Single commands:** one `pnpm install` and one `pnpm dev` run everything, and CI runs a single pipeline.
- **Undeclared imports:** with hoisting, a package can import a dependency it has not declared without an error. Code review must check that every package declares what it imports.
- **React versions differ:** web uses React 19.2.8 and mobile uses 19.2.3, which React Native 0.86 pins.
  - Shared packages must not depend on `react` directly until the versions align.
  - A pnpm `overrides` entry keeps the React type versions aligned.
