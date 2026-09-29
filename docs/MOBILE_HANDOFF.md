# Doulisha mobile app: handoff for a new session

Give this file to a new Claude Code session that starts the **Doulisha mobile app**. It summarizes what the web project built and decided until 2026-09-29, what the mobile app must reuse, and how the founder likes to work. It points to the source documents instead of copying them: read those before planning.

---

## 1. Where things are

| What                                                         | Where                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Web repository (API, database, web app)                      | <https://github.com/Hedi-Bouhelii/Doulisha>, locally `C:\Users\Hedi\Desktop\projects\dolisha`         |
| Mobile repository                                            | New and separate (ADR 0006). Suggested local folder: `C:\Users\Hedi\Desktop\projects\doulisha-mobile` |
| Live web app and API                                         | <https://doulisha.vercel.app> (Vercel, free plan)                                                     |
| Specification (wins on features, priorities, business rules) | `docs/cahier-des-charges-v2.pdf` in the web repo                                                      |
| Build prompt (wins on technology; Phase 3 = mobile)          | `docs/BUILD_PROMPT.md` in the web repo                                                                |
| API reference (every tRPC procedure)                         | `docs/API.md` in the web repo                                                                         |
| Decisions                                                    | `docs/decisions/` (ADR 0001–0022) and `docs/OPEN_QUESTIONS.md` (Q1–Q28) in the web repo               |
| Design system                                                | `docs/UX_GUIDELINES.md`, `packages/ui-tokens` in the web repo                                         |
| Translations and formatters                                  | `packages/i18n` in the web repo                                                                       |

**Read first, in this order:** this file, `BUILD_PROMPT.md` (sections 1–8, especially Phase 3), the specification, `docs/API.md`, `docs/UX_GUIDELINES.md`, `docs/OPEN_QUESTIONS.md`, then the ADRs listed in section 4 below.

## 2. The product in short

Doulisha is a platform for events and activities in Tunisia, in **Arabic, French and English** (Arabic is right-to-left). Participants discover events, book (free RSVP, paid online, D17, bank transfer, cash at the door, deposits), get tickets with QR codes, and join private invitations without an account. Organizers create events from templates, manage attendees and payments, and check people in with a scanner.

The founder, Hedi, builds it alone for now. Doulisha is not a registered company yet (this blocks Meta publishing permissions, not sign-in).

## 3. Scope of the mobile app

From BUILD_PROMPT Phase 3 (Android first, iOS later), adjusted by the decisions made since:

- **Participant side:**
  - discovery and search;
  - the event page with its wall (read, post, comment, react);
  - booking and payment;
  - **tickets available offline**;
  - private invitations and RSVP;
  - following organizers and the feed ("Mon fil");
  - messages (ask the organizer, private-event group chat);
  - "My account" (sign-in methods, privacy, blocked people);
  - language switch.
- **Organizer side:**
  - the create-event wizard;
  - the dashboard, attendee list and payments inbox;
  - messages;
  - **offline QR check-in** that syncs when the network returns (TKT-05), including "collect cash, then check in".
- **Integration:**
  - push notifications (Expo);
  - deep links (Android App Links) for event, invitation and ticket links;
  - EAS Build profiles for development, preview and production.
- **Acceptance (BUILD_PROMPT):** a Maestro flow passes on a mid-range Android emulator: open shared link → book → see ticket offline → organizer scans in airplane mode → sync.

**Founder decisions that change the original plan:**

- **No friend requests** and no "friends going" for now (ADR 0021, Q27).
- **No age restrictions** beyond the minimum age an organizer shows on the event (Q28).
- **Chat** (organizer threads and private-event group chats) is in scope and uses polling (ADR 0021).

Build only what the specification marks **MVP**, unless the founder says otherwise.

## 4. Decisions to know (web repo ADRs)

| ADR              | Why it matters for mobile                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0006             | Mobile is a separate repo; it cannot import workspace packages; the API contract must be shared another way (see section 6). App ID `tn.doulisha.app`, scheme `doulisha://` (confirmed, Q2; the Android package name cannot change after the first Play Store upload). |
| 0009             | Design system from the founder's template: tokens, fonts, components.                                                                                                                                                                                                  |
| 0010, 0016, 0019 | Better Auth: phone and email codes, passwords after a verified code, participant or organizer at sign-up, Google and Facebook sign-in, linking only on purpose (never by matching email), guest (anonymous) sessions.                                                  |
| 0011, 0012, 0018 | Booking concurrency, payments and ledger; D17 and transfer are reservations with a deadline and **no QR code until the organizer confirms the payment**; cash tickets have a QR code and are collected at the door.                                                    |
| 0017             | PDF tickets (`/api/tickets/{reference}/pdf?locale=`).                                                                                                                                                                                                                  |
| 0020             | Production database migrates itself on deploy; `ADMIN_EMAILS` for the first admin.                                                                                                                                                                                     |
| 0021             | Following organizers, feed, chat by polling (5 s while a conversation is open).                                                                                                                                                                                        |
| 0022             | Event wall, report and block, member pages, privacy settings.                                                                                                                                                                                                          |

## 5. Suggested stack (from BUILD_PROMPT section 3; confirm versions when starting)

- **App:** Expo (React Native) with Expo Router, EAS Build. Android first.
- **UI:** NativeWind with the same tokens as the web (`packages/ui-tokens`), Reanimated, Gesture Handler, FlashList, expo-image, bottom sheets.
- **i18n:** i18next with expo-localization, reusing the message files of `packages/i18n` (section 7). RTL through `I18nManager`, which needs an app reload to switch direction.
- **Data:** tRPC client with TanStack Query and superjson (section 6).
- **Auth:** Better Auth's Expo client (`@better-auth/expo`), with the session stored in SecureStore.
- **Tests:** Vitest for logic, **Maestro** for the golden paths.
- **Monitoring later:** Sentry and PostHog (Phase 6 in the web plan).

Record each technical choice as an ADR in the mobile repo, the same way as the web repo.

## 6. The API contract

- **Endpoint:** `POST/GET {BASE}/api/trpc` (tRPC 11, `httpBatchLink`, **superjson** transformer).
  - `BASE` is `https://doulisha.vercel.app` in production.
  - Locally it is `http://<computer LAN IP>:3000`: an emulator cannot reach `localhost` of the computer; the Android emulator uses `10.0.2.2`.
- **Locale:** send the header `x-doulisha-locale: ar | fr | en` on every call. Texts and emails follow it.
- **Errors:** API errors carry a message key such as `errors.soldOut`. Show the translation from the `Errors` namespace of the messages; fall back to `Errors.generic`. The list is in `docs/API.md` ("Error format").
- **Types:** the mobile repo cannot import `@doulisha/api`. Decide first (open question in ADR 0006):
  - **(recommended to start)** generate the `AppRouter` type declarations from the web repo into a small `@doulisha/api-types` package and consume it from the mobile repo (git dependency or copied build output, updated when the API changes);
  - or an OpenAPI description generated from the routers.
- **Auth (Better Auth 1.7.5)** at `{BASE}/api/auth`:
  - Cookie prefix `doulisha`.
  - Methods:
    - phone code (`/phone-number/send-otp`, `/phone-number/verify`);
    - email code (`/email-otp/...`);
    - password (`/sign-in/phone-number`, `/sign-in/email`);
    - Google and Facebook (`/sign-in/social`);
    - guest sessions (`/sign-in/anonymous`) for RSVP and booking without an account.
  - Rate limits apply in production (for example 3 code requests a minute).
  - New accounts finish setup (`account.status` → `needsSetup`, `account.completeSignUp`).
- **Uploads:** `uploads.create` returns a presigned `PUT` ticket and a key; upload the file, then pass the key to the procedure that attaches it:
  - purposes: `event-cover`, `event-photo`, `organizer-*`, `payment-proof`, `post-photo`;
  - limits: images up to 5 MB; receipts up to 8 MB, PDF allowed.
- **Payments:**
  - Online payment returns a `redirectUrl` (the mock gateway page on the web until Konnect/Flouci, Phase 6): open it in an in-app browser and return to the ticket.
  - D17 and transfer show the organizer's number or RIB and a receipt upload.
- **Tickets:** `booking.byReference` returns the order, its status and, only for confirmed places, the `ticketCode` of each ticket (the QR content). Cache it for offline display.
- **Check-in:** `organizer.checkIn({ eventId, code, collect? })` returns one of:
  - `checked_in`;
  - `already`;
  - `invalid`;
  - `payment_due` with the amount to collect (a cash ticket not paid yet).
- **Chat:** `chat.*` procedures; poll `chat.thread` every 5 s while open, `chat.unread` for the badge.
- **Useful web routes:**
  - event: `/{locale}/events/{slug}`
  - invitation: `/{locale}/invite/{token}`
  - ticket: `/{locale}/tickets/{reference}`
  - organizer page: `/{locale}/organizers/{slug}`
  - share images: `/api/og/event?slug=&locale=&format=post|story|invitation`

### Changes the mobile app will need in the web repo

Make each on its own branch in the web repo, following its `CLAUDE.md`:

1. **Better Auth for Expo:** add the `expo()` server plugin and trust the `doulisha://` scheme (`trustedOrigins`).
2. **API types package** (see "Types" above).
3. **Push notifications:**
   - a table and procedures to register Expo push tokens per device;
   - sending on booking, payment confirmed or refused, messages and reminders. Real SMS and email arrive in Phase 6; they are mocks today.
4. **Offline check-in:** a batch procedure that accepts check-ins made offline (code, time, device) and resolves conflicts (already checked in, invalid, payment due). The app also needs a way to download the event's ticket codes for offline checking.
5. **Android App Links:** serve `/.well-known/assetlinks.json` with the app's signing certificate fingerprint.
6. **Native Google and Facebook sign-in:** Android OAuth clients need the app's SHA-1 fingerprint (founder task).

## 7. Shared packages to reuse (framework-free)

- **`packages/i18n`:**
  - `messages/ar.json`, `fr.json`, `en.json`, with the same keys in every file (a test checks it);
  - formatters in `src/format.ts`: `formatPrice` (TND from **millimes**), `formatEventDateTime`, `formatDate`, `formatTime` (always **Africa/Tunis**), `formatNumber`, `formatPercent`;
  - locales in `src/locales.ts`.
  - The messages use **ICU syntax** (next-intl): plurals `{count, plural, one {…} other {…}}` and Arabic plural forms `two`, `few`, `many`. With i18next, use an ICU plugin (`i18next-icu`) rather than rewriting messages.
  - Some messages wrap numbers in `\u2066…\u2069` (left-to-right isolates) so they stay in order inside Arabic text; keep them.
- **`packages/ui-tokens`:** colours (light and dark), category accents and contrast checks in `src/tokens.ts`.
  - Primary forest green `#2D5A27`; text-safe terracotta `#A64E1F` (the template's `#C2622D` is for decoration only); cream background `#F5F0E8`; sand `#E8DCC8`; brown secondary text `#8B5E3C`; ink `#2A2420`.
  - Every text/background pair passes WCAG AA in both themes.
- **Fonts:** headlines Playfair Display (Latin) and Amiri (Arabic); body Inter (Latin) and IBM Plex Sans Arabic (Arabic). Arabic body text uses a line height of 1.7.
- **Reuse, don't fork:** decide how the mobile repo consumes these (git dependency or a sync script); do not fork the translations.

## 8. Business and product rules the app must respect

- **Formats:**
  - Money is integer **millimes** (1 DT = 1000 millimes).
  - Times are stored in UTC and shown in **Africa/Tunis**.
  - Phone numbers are **E.164** (`+216…`).
- **Privacy:**
  - **Private events** are never listed, searched, put in the feed or indexed.
  - Guest lists are visible only to hosts and guests.
- **D17 and bank transfer bookings** are _reserved places_:
  - no QR code until the organizer confirms the payment;
  - 48 hours to pay, at the latest 12 hours before the event, at least 2 hours;
  - sending a receipt pauses the deadline; a refused receipt gives 24 hours to send another (Q25).
- **Cash at the door:** the ticket has a QR code; the scanner asks to collect the amount, then checks in.
- **Chat and wall:**
  - chat: 20 messages a minute; conversations you cannot see answer "not found";
  - wall: 10 posts and 30 comments an hour, 4 photos per post.
- **Block and report:** blocked people's content is hidden and they cannot write to you; reports go to the future moderation queue (Phase 5).
- **Guests:** booking and RSVP never require an account (guest session). A guest who signs up later keeps their bookings.

## 9. Design and quality bar (BUILD_PROMPT section 6)

- **Screen states:** every screen has **loading (skeleton), empty and error** states, each with a clear next action.
- **Arabic:** every screen is tested in Arabic (RTL). Mirror directional icons; keep numbers, prices and phone numbers left-to-right; prices use Latin digits in Arabic, as in Tunisia.
- **Touch and motion:** touch targets of at least 44 px; screen-reader labels; motion 150–250 ms that respects "reduce motion".
- **Performance:** app under 40 MB; event list usable in under 2 s on 4G; images lazy-loaded as WebP.
- **Reusable components (same names as the web):** EventCard, CategoryChip, PriceTag, PlacesLeft, OrganizerCard, StickyCTA, TicketQR, AttendeeRow, EmptyState.

## 10. How the founder works (keep these rules)

- **Phase by phase:**
  - before coding a phase, post a short plan (screens, API needs, web-repo changes, tests) and **wait for "go"**;
  - at the end, run the checks, update the docs, summarize against the acceptance criteria, and stop.
- **The founder decides:**
  - when something is ambiguous, log it in `docs/OPEN_QUESTIONS.md`, pick the simplest option and continue;
  - never invent requirements; ask before big scope changes. The founder often adjusts scope, as with the friends and age decisions.
- **Git:**
  - Conventional Commits, small commits;
  - one branch per feature, never commit directly to `main`;
  - update README, `docs/*.md` and CHANGELOG in the same change as the code.
- **Secrets and mocks:**
  - never paste secrets in chat, commits or screenshots; keys live in local env files (gitignored) and in EAS/Vercel secrets;
  - SMS, email and payments use mocks in development (the web dev outbox shows codes at `/{locale}/dev/outbox` and `/api/dev/outbox` on the local server).
- **Arabic:** the founder accepted the recommended wording (Q11); keep terms consistent with the existing messages (for example "وصل" for a payment receipt).
- **Tasks for the founder:** when something needs his accounts (Google Play, Expo, OAuth clients, stores), write him a step-by-step Markdown task list, as in `docs/SOCIAL_SIGN_IN_SETUP.md`.
- **Communication:** he writes in English; the product copy is in French, Arabic and English.

## 11. State of the web project on 2026-09-29

- **Built:** Phases 0–2, the Phase 2 reviews (passwords, organizer onboarding, manual payment workflow, PDF tickets), social sign-in and sharing, the production database step, Phase 4a (follow, feed, chat) and Phase 4b (wall, report and block, member pages, privacy).
- **Not merged yet:** `main` stops before social sign-in. The branch `feat/phase-4b-wall-trust` contains all of the above (branches were stacked). Merging it into `main` brings everything live.
- **Founder actions pending:**
  - merge that branch;
  - switch the Vercel **Production** variables to the Neon `production` branch and set `ADMIN_EMAILS` (Q26, see `docs/DEPLOYMENT.md`);
  - reset the Neon `dev` branch password (it appeared in a session log).
- **Next web phases:** Phase 5 (admin back-office: verification and moderation queues, disputes, KPIs, reviews, subscriptions) and Phase 6 (real payments with Konnect and Flouci, real SMS and email, R2 storage, notifications, launch hardening).
- **Local test data:** the `dev` branch is seeded.
  - Accounts: admin `+216 20 000 001`; organizer Sami `+216 22 000 001` (Kroumirie Trekkers); participant Yasmine `+216 50 000 001`.
  - These accounts signed in by E2E tests use the password `doulisha-e2e-2026`; codes appear in the dev outbox.

## 12. Founder tasks the mobile app will need (write the step-by-step list when relevant)

- **Expo account (free)** and EAS project.
- **Google Play Console developer account:** a one-time fee (check the current amount), needed to publish and for App Links testing on real devices.
- **Android OAuth clients:**
  - Google: package `tn.doulisha.app` with the SHA-1 fingerprint;
  - Facebook: Android platform with the key hash.
- **Apple Developer account ($99/year):** only for the iPhone version later; Sign in with Apple is required there if Google or Facebook sign-in is offered.

## 13. Suggested first steps for the new session

1. **Read** the documents in section 1 (the web repo can be read locally).
2. **Propose a Phase 3 plan in parts and wait for "go".** For example:
   - **3a foundation:** Expo app, Expo Router, NativeWind with the tokens, i18n and RTL, the API types package, the tRPC client, and Better Auth with the web-repo auth change;
   - **3b participant:** discovery, event page and wall, booking, offline tickets, invitations, feed, messages, account;
   - **3c organizer:** dashboard, attendees and payments, wizard, offline check-in with the web-repo batch procedure;
   - **3d integration:** push notifications, App Links, EAS profiles, Maestro golden path.
3. **Start with the open decisions:** how the mobile repo gets the API types and the shared packages. Record them as ADRs in the mobile repo, and in the web repo when they change it.
