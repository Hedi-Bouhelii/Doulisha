# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed: Vercel build (2026-09-29)

- The Vercel build failed with "Invalid environment variables": Turborepo's strict mode hid the project variables from `next build`. They are now declared in `turbo.json`.

### Changed: manual payments and event setup (2026-09-28)

- **D17 and transfer bookings are reservations (ADR 0018):** no QR code or PDF until the organizer confirms the payment. The buyer has 48 hours to pay (never later than 12 hours before the event; OPEN_QUESTIONS Q25); sending a receipt pauses the clock; unpaid reservations expire and their places go to the waitlist. Payment instructions ask the buyer to write their booking reference in the payment message.
- **Payments inbox** for organizers (`/organizer/payments`, and a "Payments" tab on each event): receipts to verify shown inline with the expected amount, confirm with a transaction number, refuse with a reason the buyer sees (24 hours to send another), one more day, cancel a reservation. Badge in the navigation and a banner on the dashboard.
- **Buyer messages** (SMS, or email without a phone) when a payment is confirmed, a receipt refused or a reservation cancelled, in the language of the booking.
- **"Mark as paid" no longer bypasses a receipt:** it is refused while a receipt waits for review, and the attendee list shows "Verify the receipt" instead. Marking a D17 or transfer as paid asks for confirmation of the amount.
- **Cash at the door:** scanning an unpaid cash ticket shows the amount to collect, with one button "Collected, check in".
- **Guest PDF tickets** now download once, as soon as the ticket exists (also after the organizer confirms a D17 payment).
- **Tickets step of the wizard:** a new event starts with one ticket; only the price is needed. Other options (kind, quantity, people per ticket) are folded away; free events show no ticket editor.
- **Template details on the event page:** distance, difficulty, line-up and other template fields now appear in the "About" tab. The concert field "Programmation" is renamed "Artistes / line-up" with a hint. New script `pnpm db:sync-templates` updates existing template rows.
- **Back office on phones:** the data explorer no longer overflows the screen; its table list scrolls sideways.
- **Arabic wording:** "وصل" is used for every payment receipt (it mixed "وصل" and "إيصال"); the scanner button reads "تأكيد الدخول" instead of "تسجيل الدخول" (sign in).

### Added: PDF tickets (2026-09-28)

- Guests who book without an account get their ticket as a PDF, downloaded automatically after booking or paying: logo, event, date, place, pick-up point, holder, payment status and one QR code per person, in the interface language (Arabic included). Everyone can download it again from the ticket page (ADR 0017).
- The share-image code is shared with the PDF (`server/og-kit.tsx`).
- The checkout order summary no longer repeats its test id on phones and desktop.

### Changed: Phase 2 founder review (2026-09-25)

- **Accounts (ADR 0016):**
  - Separate sign-up and sign-in. Sign-up: participant or organizer, then a phone or email code, then name, city and password.
  - Sign-in with phone or email and password; "Receive a code instead" as a fallback; forgot-password by code.
  - Email codes replace magic links.
  - A guest who booked and then signs up keeps their orders and tickets (the link used to fail on them).
- **Organizers:**
  - Organizer sign-up creates a profile prefilled from the account, then a three-step onboarding: who you are, what you organize, contact and payment.
  - Profiles gain a cover, logo, contact phone and email, Facebook / Instagram / TikTok / website links, up to 12 photos of past events, and D17 / bank details for buyers.
  - The profile tab shows the profile as participants see it, with an edit mode; a public page `/organizers/{slug}` lists upcoming events. Event pages link to it.
  - "Become an organizer" for existing members.
- **Booking:**
  - Redesigned checkout: labelled steps, summary always visible, bottom action bar on phones, payment methods as cards, and "Continue" explains what is missing.
  - After choosing D17 or a transfer, the ticket page shows only that method: the organizer's number or RIB (copy button) and the receipt upload. "Pay differently" switches method on request.
  - Redesigned ticket page (next-step card, ticket-style QR cards) and "My tickets" (upcoming / past).
- **Create an event:** a first choice between a public event and a private invitation, then large template cards with photos and descriptions.
- **Navigation:** "My tickets" is hidden from visitors; "Create account" next to "Sign in".
- **Security:** social links accept only http(s) addresses; organizer images are ownership-checked upload keys, like event covers.

### Added: Phase 2, events, booking, payments, organizers and sharing (2026-09-25)

- **Event creation (EVT-01..09):**
  - "What are you organizing?" picker, then a seven-step wizard driven by the template: basics and cover, date and place, template fields, tickets, logistics, brief, publish.
  - Auto-saved drafts, publish checks shared with the server, duplicate, cancel with full refunds.
  - Admins edit templates as validated JSON at `/admin/templates`.
- **Discovery (DSC-01..05):**
  - Explore filters: when, price, for whom, places left, near me (URL parameters, work without JavaScript).
  - Home rails: tonight, this weekend, near me, and an "organize something" section.
  - Event pages: booking button (book, join the waitlist, closed), JSON-LD `Event`, canonical and language alternates, share image as the preview, `noindex` for unlisted events.
  - `sitemap.xml` (public upcoming events only) and `robots.txt`; Terms and Privacy placeholder pages.
- **Booking and tickets (TKT-01..05):**
  - Three-step checkout for members and guests: ticket types, deposit, details per person, pick-up point, questions, payment method.
  - Row-locked stock with 15-minute holds and a waitlist whose offers last 24 hours; proven by an integration test (50 parallel bookings, 10 places, exactly 10 sold).
  - "My tickets" with status, amounts due, QR codes, calendar file, receipt upload and cancellation under the refund policy.
- **Payments (PAY-01..04):** mock online gateway with signed, idempotent webhooks; D17, bank transfer and cash confirmed by the organizer or by an approved receipt; refunds; double-entry ledger.
- **Organizer tools (ORG-01, PRT-01..05, LOG-01):** dashboard (fill rate, collected, pending, sources), organizer profile, attendee list with payment status, notes and search, manual bookings, receipt and refund review, waitlist, door check-in by camera or code, Excel export and a print view for PDF.
- **Private events (INV-01..03):** quick invitation form, link to share on WhatsApp, RSVP without an account (going, maybe, can't come, +1s, food notes); the guest list is shown only to the host and to guests who answered.
- **Sharing (SHR-01..04):** WhatsApp, Facebook, Messenger, copy link and share sheet with `utm_source`; generated share images (link preview, square post, story, invitation card) in three languages, Arabic included; bookings by source for organizers.
- **Packages:** `packages/payments` (mock and manual providers) and `packages/storage` (upload policies, signed tokens, local provider).
- **Tests:** unit tests for pricing, availability, refund policy, ledger, publish checks, dates, Arabic shaping, wizard conversions and upload ownership; Playwright E2E for the Phase 2 flow in Arabic, French and English, and for private invitations.
- **Docs:** API reference for every router, ADRs 0011–0015, open questions Q14–Q20.

### Security (2026-09-25)

- Event covers were free URLs that the share-image route fetched from the server. Forms now send the upload key, the API accepts only the member's own cover uploads, and the route reads covers from disk only.

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
- **Brand:** the founder's logo and symbol replace the placeholder mark in the header, footer and sign-in page, and generate the favicon, browser icon and Apple touch icon.

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
