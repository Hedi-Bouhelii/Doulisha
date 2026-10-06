# 0024. The API types, bundled into one committed file for the mobile app

- Status: Accepted (founder "go" on mobile Phase 3, 2026-09-29)
- Date: 2026-09-29
- Answers the open question of ADR 0006 (how the mobile repository gets the API contract)

## Context

The mobile app lives in its own repository (ADR 0006) and cannot import `@doulisha/api`. tRPC gives a client full type checking of every procedure from the router's type alone, with no code generation. The alternative, an OpenAPI description, would need an output schema and OpenAPI metadata on every procedure.

## Decision

- **`packages/api-types`** bundles `AppRouter`, `RouterInputs` and `RouterOutputs` into one declaration file, `dist/index.d.ts`, with `rollup-plugin-dts` (`pnpm --filter @doulisha/api-types build`).
  - Types from this repository's packages are inlined. Libraries stay imports (`@trpc/server`, `zod`, `better-auth`, `@better-auth/expo`, `drizzle-orm`, `@neondatabase/serverless`); the mobile app installs them, the last two for types only.
  - The plugin turns on TypeScript's `preserveSymlinks` by default, which cannot name types through pnpm's symlinked packages; the config turns it off.
- **`Context` is a named interface** in `packages/api/src/context.ts`. Inferred, it was repeated in full in every router's type (a 2.4 MB declaration); named, the bundle is about 0.6 MB. Server behaviour is unchanged.
- **The bundle is committed** (an exception in `.gitignore`), so the mobile repository copies it from any checkout without building the web repository. CI rebuilds it and fails when the committed file differs ("API types are up to date").
- **The mobile repository** copies it with its `sync:web` script, which records the web commit it came from.

## Consequences

- After changing a procedure, run the build and commit `dist/index.d.ts` with the change, or CI fails.
- The mobile app sees an API change only after its next `sync:web`; its typecheck then shows every screen the change breaks.
- Type-only; nothing from the server runs in the app.
