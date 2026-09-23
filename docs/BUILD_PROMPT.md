# Doulisha — Master build prompt for Claude Code

> **Amendments (these take precedence over the text below):**
> - **2026-09-24:** This repository is the **web application only**. The mobile app will be built later as a separate project in its own repository (see `docs/decisions/0006-web-only-repository.md`). Phase 3 and the mobile parts of Phase 1 are out of scope here. Neon is linked (see `docs/ARCHITECTURE.md`, section "Neon project").

> **How to use this prompt**
> 1. Put the specification in the repository at `docs/cahier-des-charges-v2.pdf` (the file `Cahier_des_charges_Doulisha_v2.pdf`).
> 2. Open the repository (the existing Next.js MVP, or an empty folder) in VS Code with Claude Code.
> 3. Paste everything below the line into Claude Code. It will do **Phase 0 only**, then stop and wait for your review.
> 4. For each next phase, write: `Continue with Phase N as described in docs/BUILD_PROMPT.md`.

---

## 1. Your role

You are a senior full-stack engineer and product designer building **Doulisha**, the social platform for events and activities in Tunisia. You work with a small team, so you favour boring, well-documented technology, strict typing, small reviewable steps and clear documentation.

**Source of truth:** `docs/cahier-des-charges-v2.pdf`. Read it fully before writing any code. When this prompt and the specification disagree, this prompt wins on **technology choices**; the specification wins on **features, priorities and business rules**. If something is ambiguous, write the question in `docs/OPEN_QUESTIONS.md`, pick the simplest reasonable option, and continue.

Save this prompt as `docs/BUILD_PROMPT.md` so later sessions can refer to it.

## 2. Product summary (from the specification)

- One event engine, **four event models**:
  - **A. Ticketed event:** concerts, workshops, parties.
  - **B. Group trip:** model A plus itinerary, meeting points, vehicles.
  - **C. Private event:** birthdays, surprises, dinners; invitations, RSVP, gift pool.
  - **D. Slot booking:** padel courts, spa slots, couples packages (V1).
- **Category templates** (hike, padel match, birthday, concert, workshop…) choose a model, the wizard fields, the default brief, the cancellation policy and the enabled modules. Templates are data, editable by admins, not code.
- **Roles on one account:** visitor, guest (RSVP without account), participant, host, organizer, co-organizer, provider/venue, brand, admin.
- **Social layer in MVP:** friends, follows, activity feed, event wall, "friends going".
- **Languages:** Arabic (RTL, Tunisian-friendly), French, English.
- **Payments:** Konnect and/or Flouci (cards, e-Dinar), D17, cash and bank transfer with proof upload. Currency: TND.
- **MVP launch verticals:** outdoor trips, ticketed events and workshops, private invitations. Venues/padel, providers marketplace and couples are **V1**: design the schema for them now, build them later.

Build **only items marked MVP** in section 7 of the specification unless a phase below says otherwise.

## 3. Technology stack (mandatory)

Always install the **latest stable versions** and check the official documentation before using an API you are not sure about. Record every important choice in an ADR (`docs/decisions/NNNN-title.md`).

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | One TypeScript codebase for web, mobile and API |
| Language | **TypeScript** in `strict` mode everywhere | No `any` without a comment explaining why |
| Database | **Neon (serverless PostgreSQL)** | Use **`@neondatabase/serverless`**. HTTP driver for simple queries; WebSocket `Pool` for transactions (bookings, payments, stock) |
| ORM and migrations | **Drizzle ORM + drizzle-kit** | Schema in `packages/db`, SQL migrations committed, never `push` in production |
| Postgres extensions | `postgis` (geo), `pg_trgm` + `unaccent` (search) | Enable in the first migration |
| Neon branching | One Neon branch per pull request / preview deployment | Seed data on each branch |
| API | **tRPC** (served by the Next.js app) + **Zod** validation | Shared by web, mobile and admin. Public REST endpoints only for webhooks (payments) and Open Graph images |
| Auth | **Better Auth** with Drizzle adapter on Neon | Phone OTP (SMS), email magic link, Google, Facebook, Apple; Expo integration for mobile; guest RSVP sessions |
| Web | **Next.js (App Router)**, React Server Components, SSR for SEO | Deployed on Vercel |
| Web UI | **Tailwind CSS + shadcn/ui (Radix)**, lucide icons, Framer Motion for subtle motion | Use logical properties (`ms-`, `pe-`, `start-`) for RTL |
| Mobile | **Expo (React Native) + Expo Router**, EAS Build | Android first, iOS later |
| Mobile UI | **NativeWind** (same Tailwind tokens as web), Reanimated, Gesture Handler, FlashList, expo-image, bottom sheets | |
| Shared state and data | TanStack Query (through tRPC), React Hook Form + Zod | Same Zod schemas on client and server |
| i18n | `next-intl` (web), `i18next` + `expo-localization` (mobile), shared message files in `packages/i18n` | `ar`, `fr`, `en`; RTL with `I18nManager` on mobile |
| File storage | **Cloudflare R2** (S3 API) with presigned uploads, images served as WebP | Photos, payment proofs, verification documents (private bucket) |
| Background jobs | **Inngest** (or Trigger.dev, document the choice) | Reminders D-3/D-1, expiring ticket holds, waitlist offers, payouts |
| Notifications | Expo push notifications, **Resend + React Email**, SMS provider behind an interface | |
| Realtime | Polling with TanStack Query for MVP; Ably or Pusher behind an interface for chat in V1 | Neon has no built-in realtime |
| Maps | MapLibre / OpenStreetMap tiles (Mapbox optional), GPX parsing | |
| Social images | `@vercel/og` (Satori) | Post 1:1, story 9:16, invitation cards, in AR/FR/EN |
| Payments | `PaymentProvider` interface with implementations: `mock`, `konnect`, `flouci`, `manual` (cash/transfer/D17 with proof) | Webhooks verified and idempotent |
| Quality | ESLint, Prettier, Vitest, Testing Library, **Playwright** (web E2E), **Maestro** (mobile E2E) | |
| Observability | Sentry (web + mobile), PostHog (product analytics, funnels, UTM) | |
| CI | GitHub Actions: lint, typecheck, test, build, Neon branch per PR, migration check | |

Do not introduce Supabase, Firebase Auth or another database. If you believe a different library is clearly better, write an ADR and ask before switching.

## 4. Repository structure

```
doulisha/
├─ apps/
│  ├─ web/          # Next.js: public site, event pages, guest RSVP, organizer dashboard, /admin, tRPC server, webhooks
│  └─ mobile/       # Expo app: participants, hosts, organizers, QR check-in
├─ packages/
│  ├─ db/           # Drizzle schema, migrations, seed, query helpers
│  ├─ api/          # tRPC routers, services (business logic), permissions
│  ├─ auth/         # Better Auth config shared by web and mobile
│  ├─ validators/   # Zod schemas shared everywhere
│  ├─ i18n/         # ar / fr / en messages, formatters (TND, dates in Africa/Tunis)
│  ├─ ui-tokens/    # Colours, spacing, radii, typography shared by Tailwind and NativeWind
│  ├─ templates/    # Category template definitions and their Zod field schemas
│  ├─ payments/     # PaymentProvider interface + implementations
│  ├─ notifications/# Push, email, SMS adapters
│  └─ config/       # eslint, tsconfig, tailwind presets
├─ docs/
│  ├─ cahier-des-charges-v2.pdf
│  ├─ BUILD_PROMPT.md
│  ├─ ARCHITECTURE.md, DATABASE.md, API.md, UX_GUIDELINES.md, DEPLOYMENT.md
│  ├─ decisions/    # ADRs
│  └─ OPEN_QUESTIONS.md
├─ CLAUDE.md        # Short working rules for future Claude Code sessions
└─ README.md        # Setup in under 10 minutes
```

**Layering rule:** UI → tRPC router → service → Drizzle. Routers stay thin; business rules (capacity, waitlist, refunds, permissions) live in services and are unit-tested.

## 5. Database rules (Neon + Drizzle)

- **IDs:** UUID v7 (sortable) or `cuid2`; document the choice.
- **Money:** integer **millimes** (1 TND = 1000 millimes), never floats. Column suffix `_millimes`.
- **Time:** `timestamptz` everywhere; display in `Africa/Tunis`.
- **Phones:** E.164 (`+216…`).
- **Soft delete** (`deleted_at`) for user content; hard delete on account deletion (law 2004-63, right to delete).
- **Template fields:** common columns on `events`, category-specific fields in `events.details` (JSONB) validated by the template's Zod schema on write.
- **Concurrency:** ticket stock and slot booking use a transaction with `SELECT … FOR UPDATE` or reservation holds with expiry. Write a test that simulates 50 parallel purchases on 10 places and proves no overselling.
- **Indexes:** on every foreign key, on `(status, starts_at)`, a GiST index on locations, trigram indexes for search.
- Use the WebSocket `Pool` from `@neondatabase/serverless` for transactions and the HTTP driver elsewhere; document both in `docs/DATABASE.md`.

**Tables** (from specification section 9.1; build MVP tables now, create V1 tables only when their phase starts):

- **Identity and social:** users, profiles, organizer_profiles, provider_profiles, verifications, friendships, follows, posts, comments, reactions, media, reports, blocks, notification_preferences.
- **Events:** categories, templates, events, occurrences, itinerary_steps, meeting_points, ticket_types, booking_questions, invitations, rsvps, checklists.
- **Commerce:** orders, bookings, attendees, payments, payment_proofs, refunds, ledger_entries, payouts, subscriptions, promo_codes, invoices.
- **V1:** communities, memberships, venues, resources, slots, services, packages, service_requests, quotes, vehicles, seat_assignments, gift_pools, contributions, reviews, badges, xp_events.

Write `docs/DATABASE.md` with an ER diagram in Mermaid and a description of each table.

## 6. UI and UX direction

The UI must feel as polished as the best international apps, while staying local, warm and fast on a mid-range Android phone over 4G. **Learn from patterns, never copy branding, assets or text.**

| Screen / flow | Learn from | What to apply |
|---|---|---|
| Home and discovery | Airbnb Experiences, Fever | Large image cards, horizontal category chips, "This weekend / Tonight / Near me" rails, skeleton loading |
| Event page | Luma, Eventbrite, Airbnb | Hero image, sticky bottom "Book / RSVP" bar with price and places left, organizer card, friends going avatars, clear "what's included" |
| Private invitations | Partiful, Luma | Playful themed cover, one-tap RSVP from a WhatsApp link without an account, guest list with avatars |
| Padel / slots (V1) | Playtomic | Day strip + time-slot grid, level badges, open-match spots |
| Social feed and event wall | Instagram | Familiar reactions, comments, stories-like memories |
| Checkout | Airbnb, Eventbrite | Maximum 3 steps, order summary always visible, local payment methods first, clear deposit/balance |
| Organizer dashboard | Eventbrite Organizer, Luma host, Stripe dashboard | KPI cards (fill rate, revenue, pending payments), filterable attendee table, bulk actions, exports |
| Check-in | Eventbrite Organizer app | Full-screen scanner, big green/red feedback, haptics, works offline |
| Create event wizard | Airbnb host flow | One question per screen on mobile, progress bar, auto-save, live preview |

**Design system** (`packages/ui-tokens`, documented in `docs/UX_GUIDELINES.md`):

- **Palette:** brand green `#2F5D3A`, terracotta `#C4623A`, cream `#F7F1E5`, plus neutrals, success, warning and error colours.
  - Light and dark themes.
  - WCAG AA contrast.
- **Category accents:** each category gets an accent colour and an icon, so the app does not look outdoor-only.
- **Typography:** one Latin font and one Arabic font with good Tunisian readability (for example, Poppins or Inter with IBM Plex Sans Arabic or Noto Sans Arabic). Tell me the pairing you pick.
- **RTL:** every screen tested in Arabic.
  - Icons with direction (arrows, chevrons) mirror.
  - Numbers and prices keep a readable format.
- **Touch and accessibility:** minimum 44 px touch targets, visible focus states, screen-reader labels.
- **Required states:** empty, loading (skeletons) and error states on every screen, each with a friendly illustration and a clear next action.
- **Motion:** short and purposeful (150–250 ms); respect "reduce motion".
- **Performance budget:**
  - Event list interactive in under 2 s on 4G.
  - Mobile app under 40 MB.
  - Images lazy-loaded as WebP.
- **Reusable components:** EventCard, CategoryChip, PriceTag, PlacesLeft, FriendsGoing, OrganizerCard, StickyCTA, TicketQR, AttendeeRow, EmptyState. Build them once and document them (Storybook for web is optional).

## 7. Engineering best practices

- **Security:**
  - Role- and ownership-based permission checks in every service.
  - Rate limiting on auth, booking and search.
  - Presigned uploads with type and size limits.
  - Private bucket for verification documents and payment proofs.
  - Webhook signature verification.
  - No secrets in code; validate all env vars with Zod in `env.ts`, and keep `.env.example` up to date.
- **Privacy:**
  - Private events are never listed or indexed (`noindex`); guest lists are visible only to hosts and guests.
  - Contact import requires explicit consent, and contacts are stored hashed.
  - Medical and emergency data are encrypted at the column level or in a separate table with strict access.
- **Idempotency:** payment webhooks, booking creation and notifications must be idempotent (idempotency keys).
- **Testing:**
  - Unit tests for every service with business rules.
  - Integration tests on a Neon branch.
  - Playwright E2E for: create event → share → book → pay (mock) → check-in.
  - Maestro flows for the mobile golden paths.
- **Git:**
  - Conventional Commits, small commits, one feature per branch.
  - Never commit directly to `main` in later phases.
- **Documentation:**
  - Update `README.md`, `docs/*.md` and `CHANGELOG.md` in the same change as the code.
  - Every tRPC procedure has a JSDoc comment, and `docs/API.md` lists routers and procedures.
- **Seed data:** realistic Tunisian data in AR/FR/EN:
  - Events: a hike in Ain Draham, a concert in Tunis, a pottery workshop in Sidi Bou Said, a birthday.
  - Organizers, users and payment states.
  - Enough to demo every screen.

## 8. Build order

Work phase by phase. At the end of each phase:

1. Run lint, typecheck and tests.
2. Update the docs.
3. Give me a short summary with the phase's acceptance-criteria checklist and how to try it.
4. **Stop and wait for my approval.**

The API and database come before any interface. Web comes before mobile, because guests RSVP on the web, event pages need SEO, the organizer dashboard is desktop-first and the existing MVP is already Next.js. Mobile then reuses the same API.

### Phase 0: Audit and foundations
- Read the specification.
  - If a Next.js MVP exists, audit it against section 4 of the specification and list what to keep, migrate or delete.
- Set up the monorepo, tooling, strict TypeScript, ESLint/Prettier and GitHub Actions CI.
- Move the existing web app into `apps/web`.
- Create `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md` (Mermaid diagrams), the first ADRs and `.env.example`.
- **Acceptance:** `pnpm install && pnpm dev` runs web and an empty Expo app; CI is green.

### Phase 1: Data, auth, i18n, design system
- Connect Neon, write the Drizzle schema for MVP tables, the first migrations with extensions, and the seed script. Write `docs/DATABASE.md`.
- Set up Better Auth: phone OTP (mock SMS in dev), email magic link, Google/Facebook/Apple; multi-role accounts; guest sessions.
- Set up i18n in ar/fr/en with RTL on web and mobile, plus TND and date formatters.
- Build `ui-tokens`, the Tailwind and NativeWind presets, and the base components (section 6) on web and mobile.
- Build the tRPC skeleton with auth context, permissions helpers and error format.
- **Acceptance:** sign up and log in on web and mobile; switch language to Arabic and the layout flips; seed data visible in an admin table.

### Phase 2: Event engine and web experience (MVP core)
1. **Templates and wizard:** category templates package and admin-editable templates (EVT-09); create-event wizard on web (EVT-01 to EVT-08) with auto-save and preview.
2. **Discovery:** public event page with SSR, Open Graph and JSON-LD `Event` schema (DSC-03, DSC-04); home and search with filters (DSC-01, DSC-02, DSC-05); quick wins from the audit (no 404s, past events hidden, Terms and Privacy pages).
3. **Booking:**
   - Tickets and registration (TKT-01 to TKT-05).
   - Booking and checkout with the `mock` and `manual` payment providers (PAY-01 to PAY-04).
   - Refund rules from the cancellation policy (PAY-04 in v2 numbering).
   - Payment proof upload.
4. **Private events:** quick private event, invitations by link, RSVP without account (INV-01 to INV-03).
5. **Organizer tools:**
   - Organizer dashboard (ORG-01).
   - Attendee list, manual add, payment validation, waitlist auto-offer, PDF/Excel export (PRT-01 to PRT-05).
   - Meeting points for trips (LOG-01).
6. **Sharing:** share buttons, generated post/story/invitation images, smart links, UTM tracking (SHR-01 to SHR-04).
- **Acceptance:** the Playwright flow (create hike → publish → share → guest books with mock payment → organizer validates → ticket QR) passes in all three languages.

### Phase 3: Mobile app (Android first)
- **Participant side:** discovery, event page, booking, tickets with offline access, private invitations and RSVP, favorites, profile, language switch.
- **Organizer side:** mobile create-event wizard, dashboard, attendee list, broadcast, **offline QR check-in** that syncs when the network returns (TKT-05).
- **Integration:** push notifications through Expo; deep links (Android App Links) that open event and invitation links in the app; EAS Build profiles for development, preview and production.
- **Acceptance:** the Maestro flow (open shared link → book → see ticket offline → organizer scans in airplane mode → sync) passes on a mid-range Android emulator.

### Phase 4: Social layer (MVP)
- Friends with consented contact matching, follows, activity feed, event wall with posts and comments, reactions, "friends going" everywhere (SOC-01 to SOC-05).
- Privacy settings (ACC-06), report and block (TRS-03), private-event privacy rules (TRS-06), age-gated events (TRS-05).
- **Acceptance:** two seeded users see each other's upcoming events in the feed; private events never appear in feed, search or sitemap.

### Phase 5: Admin back-office and trust
- Build `/admin` in the web app with the verification queue (ACC-04, ADM-01), moderation queue with automatic text and image filters behind an interface (TRS-04, ADM-02), disputes and refunds (ADM-03), categories, templates, featured events and banners (ADM-04), and a KPI dashboard (ADM-05).
- Add verified reviews tied to check-in (TRS-01) and organizer stats (TRS-02).
- Add subscriptions and the free trial (ORG-02, specification section 10).
- **Acceptance:** an admin approves an organizer, removes a reported post and refunds a booking, and every action is recorded in an audit log.

### Phase 6: Real payments, notifications and launch hardening
- Payments: Konnect and Flouci implementations with a sandbox, webhooks, reconciliation job, and a ledger that balances.
- Notifications: reminder jobs (D-3, D-1), waitlist offers, expiring holds (COM-01 to COM-04).
- Performance: audit against the budgets in section 6. Security: review auth, permissions, uploads, rate limits, OWASP top 10.
- Launch readiness:
  - Legal pages placeholders for lawyer review.
  - Sentry and PostHog funnels.
  - Backups and restore test on Neon.
  - `docs/DEPLOYMENT.md` and a launch checklist.
- **Acceptance:** a real sandbox payment runs end to end; Lighthouse ≥ 90 on event pages; no critical Sentry errors in the E2E runs.

### After MVP: V1 backlog
- Do not build anything in this section until I ask.
- Turn these into GitHub issues with acceptance criteria:
  - Provider marketplace (PRV).
  - Venues and slot booking with padel open matches (SLT).
  - Gift pools and split payments.
  - Communities.
  - Gamification.
  - iOS release.
  - Direct Meta publishing.
  - AI description assistant.

## 9. Working rules for every session

1. **Plan before coding:** for each phase, first post a short plan (files, tables, routes, screens, tests) and wait for my "go".
2. Work in small, verifiable steps. After each step, run typecheck and tests.
3. Never delete or rewrite existing code without explaining why.
4. Never invent requirements. If the specification is silent, choose the simplest option and log it in `docs/OPEN_QUESTIONS.md`.
5. **Credentials:** use mocks for SMS, payments and email in development. Ask me for real credentials only in Phase 6, and never hard-code them.
6. **Arabic copy:** if you are unsure about Arabic or Tunisian wording, mark the string with `// TODO(i18n-review)` so a native speaker can review it.
7. **Phase summary:** end every phase with what was built, how to test it, known limitations and the next phase's plan.

**Start now with Phase 0.**
