# Architecture

Doulisha is one TypeScript monorepo. It contains a Next.js web app, an Expo mobile app, and shared packages for the database, the API, auth, validation, translations, design tokens, templates, payments and notifications. Decisions and their reasons are recorded in [`decisions/`](decisions/README.md).

> Status: Phase 0. The apps and the tooling exist. Most packages are still empty and are filled in from Phase 1 onwards (see [`BUILD_PROMPT.md`](BUILD_PROMPT.md) section 8).

## 1. System context

```mermaid
flowchart LR
  subgraph Users
    V[Visitor / guest<br/>browser, WhatsApp link]
    P[Participant / host<br/>Android app]
    O[Organizer<br/>desktop + app]
    A[Admin<br/>/admin]
  end

  subgraph Vercel
    WEB[apps/web<br/>Next.js: pages, SSR/SEO,<br/>tRPC server, webhooks, OG images]
  end

  MOB[apps/mobile<br/>Expo app]

  V --> WEB
  O --> WEB
  A --> WEB
  P --> MOB
  O --> MOB
  MOB -- tRPC over HTTPS --> WEB

  WEB --> NEON[(Neon PostgreSQL<br/>PostGIS, pg_trgm)]
  WEB --> R2[(Cloudflare R2<br/>public + private buckets)]
  WEB --> JOBS[Inngest<br/>reminders, holds, waitlist]
  JOBS --> WEB
  WEB --> PAY[Konnect / Flouci<br/>D17, manual proofs]
  PAY -- signed webhooks --> WEB
  WEB --> NOTIF[Expo push, Resend email,<br/>SMS provider]
  WEB --> OBS[Sentry, PostHog]
  MOB --> OBS
```

## 2. Monorepo layout and dependencies

```mermaid
flowchart TD
  web[apps/web] --> api[packages/api]
  web --> auth[packages/auth]
  web --> i18n[packages/i18n]
  web --> tokens[packages/ui-tokens]
  mobile[apps/mobile] --> i18n
  mobile --> tokens
  mobile --> validators[packages/validators]
  mobile -. tRPC types only .-> api

  api --> db[packages/db]
  api --> validators
  api --> templates[packages/templates]
  api --> payments[packages/payments]
  api --> notifications[packages/notifications]
  api --> auth
  auth --> db
  templates --> validators

  config[packages/config<br/>tsconfig + ESLint presets] -. dev .-> web & mobile & api & db
```

| Path                     | Responsibility                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `apps/web`               | Public site, event pages (SSR), guest RSVP, organizer dashboard, `/admin`, tRPC server, webhooks |
| `apps/mobile`            | Expo app for participants, hosts and organizers, including QR check-in                           |
| `packages/db`            | Drizzle schema, SQL migrations, seed, query helpers                                              |
| `packages/api`           | tRPC routers (thin), services (business rules), permissions                                      |
| `packages/auth`          | Better Auth configuration shared by web and mobile                                               |
| `packages/validators`    | Zod schemas used on client and server                                                            |
| `packages/i18n`          | `ar` / `fr` / `en` messages, locale helpers, TND and date formatters                             |
| `packages/ui-tokens`     | Colours, spacing, radii and typography for Tailwind and NativeWind                               |
| `packages/templates`     | Category templates (model, wizard fields, brief, policy, modules)                                |
| `packages/payments`      | `PaymentProvider` interface: `mock`, `manual`, `konnect`, `flouci`                               |
| `packages/notifications` | Push, email and SMS adapters                                                                     |
| `packages/config`        | Shared `tsconfig` bases and ESLint presets (`base`, `next`, `expo`)                              |

Internal packages are published as TypeScript source (`exports: ./src/index.ts`). Each app compiles them itself (see ADR 0001).

## 3. Request layering

```mermaid
sequenceDiagram
  participant UI as UI (web or mobile)
  participant R as tRPC router
  participant S as Service
  participant D as Drizzle / Neon
  UI->>R: call procedure (input)
  R->>R: validate input with Zod, build auth context
  R->>S: call service(ctx, input)
  S->>S: permission check (role + ownership), business rules
  S->>D: queries / transaction (WebSocket Pool, FOR UPDATE)
  D-->>S: rows
  S-->>R: result
  R-->>UI: typed response
```

Rules:

- **Routers stay thin.** Anything with a business rule (capacity, waitlist, refunds, permissions) goes in a service, and every service is unit-tested.
- **Money** is stored as integer millimes (`*_millimes`). Times are `timestamptz`, displayed in `Africa/Tunis`.
- **Idempotency.** Payment webhooks, booking creation and notifications take idempotency keys.

## 4. Event engine (target, Phase 2)

There is one `events` table for every kind of event. Each event references a **template**, and the template picks one of the four models (A ticketed, B group trip, C private, D slot booking). Fields shared by every template are columns. Fields specific to a category live in `events.details` (JSONB), validated on write by the template's Zod schema from `packages/templates`. Admins edit templates as data (EVT-09).

## 5. Environments

| Environment  | Web                    | Database                       |
| ------------ | ---------------------- | ------------------------------ |
| Local        | `pnpm dev` (port 3000) | Neon dev branch (from Phase 1) |
| Pull request | Vercel preview         | Neon branch per PR, seeded     |
| Production   | Vercel                 | Neon `main` branch             |

The mobile app points to the local web server in development, and to the preview or production API through EAS build profiles (Phase 3).
