# Phase 0 audit of the existing MVP

**Date:** 2026-09-23

## What was audited

The existing Next.js MVP source code was **not available** in this repository. The project folder contained only the specification and the build prompt. This audit is therefore based on:

- specification section 4, "Audit of the current MVP", checked by the author on 22 September 2026;
- the build prompt.

**Update (2026-09-24):** the founder confirmed there is no old source code (OPEN_QUESTIONS Q1). The "Existing MVP" column below therefore describes the old deployed site, and everything is rebuilt from scratch.

**Decision:** `apps/web` was created from a fresh Next.js 16 project instead of migrating the old app. Once the old code is available, anything worth keeping will be moved in feature by feature, under the new architecture.

## Keep, migrate or delete

| Area (spec section 4) | Existing MVP                                                         | Verdict            | Where it lands in the new build                                                                                                 |
| --------------------- | -------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Framework             | Next.js, responsive web                                              | Keep               | `apps/web` (Next.js 16, App Router)                                                                                             |
| Positioning / home    | Outdoor wording, hiking categories, mountain logo                    | Migrate            | Home rewritten for all events and activities (Phase 2, DSC-02); brand question Q5                                               |
| Trip pages / search   | Hero, trip-specific search (difficulty, travellers), 1 featured trip | Migrate            | Generic search (what, where, when, for whom) plus template-specific filters (Phase 2, DSC-01)                                   |
| Trip card / detail    | Card (Rtiba, 60 DT); detail link returns 404; past trips featured    | Delete and rebuild | SSR event page with Open Graph and JSON-LD; past events hidden (Phase 2, DSC-03/04)                                             |
| Booking               | "No account needed" promised; no payment, confirmation or reference  | Delete and rebuild | Checkout with `mock` and `manual` providers, booking reference, QR ticket (Phase 2)                                             |
| Organizer dashboard   | Mock data (fill rates, "Create trip")                                | Delete and rebuild | Real dashboard with auth, attendee list, payment status and exports; "Create event" with category choice (Phase 2, ORG-01, PRT) |
| Providers             | "Coming soon" page with notify-me                                    | Delete             | Provider directory (PRV-01/02); timing is question Q7                                                                           |
| Community / social    | Home-page section only                                               | Delete and rebuild | Profiles, friends, follows, feed, event wall (Phase 4, SOC)                                                                     |
| Languages             | EN / FR switch, no Arabic                                            | Migrate            | `packages/i18n` with ar (RTL), fr and en on the web (Phase 1)                                                                   |
| Trust and legal       | Privacy, Terms and social links point to `#`                         | Delete and rebuild | Real Terms and Privacy pages (Phase 2 quick wins), verification and reviews (Phase 5)                                           |
| Name                  | Site says "Dolisha", logo says "Doulisha"                            | Fixed              | "Doulisha" everywhere in code (package names, app name, `doulisha://` scheme); domain and stores to confirm (Q2)                |
| Mobile                | None                                                                 | New                | A separate repository, created later (ADR 0006)                                                                                 |

## Quick wins from the specification

These must be live before any new feature ships (spec section 4). They are scheduled in Phase 2, step 2.

- [x] No 404s: every event card links to a working SSR page (Phase 1; JSON-LD and share images in Phase 2)
- [x] Past events hidden from home and search (Phase 1, `publicListingConditions`)
- [ ] Real Terms and Privacy pages (placeholders for lawyer review)
- [x] One spelling, "Doulisha", in the codebase
- [ ] Social links connected (URLs needed, Q2)
- [x] Home-page wording changed from "trips" to "events and activities" (Phase 1 home page)
