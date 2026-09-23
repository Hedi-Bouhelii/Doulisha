# Working rules for Claude Code (Doulisha)

Read first:

- `docs/BUILD_PROMPT.md`: role, stack, phases and working rules. It wins on **technology**.
- `docs/cahier-des-charges-v2.pdf`: the specification. It wins on **features, priorities and business rules**.

**Scope:** this repository is the **web application only**. The mobile app will be a separate project (ADR 0006). Skip BUILD_PROMPT Phase 3 and the mobile parts of other phases, and keep `packages/i18n` and `packages/ui-tokens` framework-free so the mobile app can reuse them.

## Workflow

- Work phase by phase (BUILD_PROMPT section 8).
  - Before coding a phase, post a short plan (files, tables, routes, screens, tests) and wait for "go".
  - At the end of a phase, run the checks, update the docs, summarize against the acceptance criteria, then **stop**.
- Build only features marked **MVP** in the spec, unless the phase says otherwise. Never invent requirements.
- When the spec is ambiguous: log the question in `docs/OPEN_QUESTIONS.md`, pick the simplest option, and continue.
- Never delete or rewrite existing code without saying why.
- Git:
  - Use Conventional Commits and small commits.
  - After Phase 0, use one branch per feature and never commit directly to `main`.
- Update `README.md`, `docs/*.md` and `CHANGELOG.md` in the same change as the code.
- Record every important technical choice as an ADR in `docs/decisions/`.

## Commands

```sh
pnpm install          # install everything
pnpm dev              # web app on localhost:3000
pnpm check            # format check + lint + typecheck + test (run before finishing any step)
pnpm build            # production build of the web app
pnpm --filter @doulisha/web <script>     # run a script in one package
```

## Code rules

- **TypeScript:**
  - `strict` mode plus `noUncheckedIndexedAccess`.
  - No `any`. A lint rule enforces it; a disable comment must say why (`// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason`).
- **Layering:** UI → tRPC router → service → Drizzle. Routers stay thin. Business rules and permission checks live in services, with unit tests.
- **Validation:** Zod schemas live in `packages/validators` and are shared by client and server. Environment variables are validated in each app's `env.ts`; keep `.env.example` in sync.
- **Data types:**
  - Money is integer **millimes** (`*_millimes`).
  - Times are `timestamptz`, displayed in `Africa/Tunis`.
  - Phone numbers are stored in E.164 format.
- **Database access (Neon):**
  - Use the HTTP driver for simple queries.
  - Use the WebSocket `Pool` for transactions (bookings, payments, stock).
  - Never run `drizzle-kit push` against production.
  - `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, for migrations) are in the root `.env.local`, written by `neon link`. The database is `Doulisha`, not `neondb`.
  - The `neon` CLI is installed and logged in. Neon agent skills are in `.claude/skills/`: use them for Neon questions.
  - Auth is **self-managed Better Auth**, not Neon Managed Auth (OPEN_QUESTIONS Q10).
- **RTL:** use logical properties only (`ms-`, `pe-`, `start-`, `end-`, never `ml-`, `pr-`, `left-`). Mirror directional icons. Test every screen in Arabic.
- **Arabic copy:** mark any Arabic or Tunisian wording you are unsure of with `// TODO(i18n-review)`.
- **Development mocks:** SMS, payments and email always use mocks in development. Never hard-code credentials.
- **Privacy:**
  - Private events are never listed or indexed.
  - Guest lists are visible only to hosts and guests.
- **Web app:** before writing Next.js code, read `apps/web/AGENTS.md`. Next 16 has breaking changes; its docs are in `node_modules/next/dist/docs/`.

## Toolchain notes

- The repo uses TypeScript 6.0, not 7, and ESLint 9, not 10, until typescript-eslint and eslint-config-next support the newer versions. See ADR 0005.
- pnpm uses its default isolated `node_modules` layout. Every package must declare the dependencies it imports.
- pnpm 12 blocks install scripts and very new releases by default. Allow or refuse each package explicitly in `pnpm-workspace.yaml` (`allowBuilds`); do not turn the protection off.
