# 0010. Better Auth setup: tables, sign-in methods, guests and roles

- Status: Accepted
- Date: 2026-09-24

## Context

ADR 0003 chose self-managed Better Auth; OPEN_QUESTIONS Q10 confirmed it over Neon Managed Auth, which lacks phone-number sign-up and Facebook/Apple login. This ADR records the concrete setup (`packages/auth`).

## Decision

- **Tables:** Better Auth uses our Drizzle tables `users`, `sessions`, `accounts` and `auth_tokens` (its "verification" model), mapped explicitly in the Drizzle adapter. Postgres generates the ids (ADR 0007).
- **Sign-in methods (ACC-01):**
  - phone OTP with sign-up on verification; phone-only accounts get a `…@phone.doulisha.invalid` placeholder email and are asked for their name after the first code;
  - email magic link (15 minutes), new accounts named after the part before "@";
  - Google, Facebook and Apple, each enabled only when its credentials are set;
  - no passwords.
- **Guests:** the anonymous plugin gives RSVP guests a session without an account (`…@guest.doulisha.invalid`). When a guest later signs up, `onLinkAccount` moves their RSVPs to the new account.
- **Roles (ACC-05):** our own `user_roles` table (`organizer`, `provider`, `brand`, `admin`) read into the tRPC context; everyone is a participant. Better Auth's admin plugin is not used, because it stores a single role string.
- **Profiles:** a database hook creates a `profiles` row with default privacy settings for every new user.
- **Mocks:** SMS and email go to `@doulisha/notifications` mock senders in development and CI; the dev outbox (`/fr/dev/outbox`, `/api/dev/outbox`) shows codes and links. Real providers arrive in Phase 6.
- **Rate limiting:** stricter rules on OTP, verify, magic link and anonymous endpoints; on in production only (Better Auth's own default), in memory for now.

## Consequences

- Placeholder emails must never be mailed; the `.invalid` TLD guarantees they cannot be delivered.
- A shared rate-limit store (database or Redis) is needed before running several server instances (Phase 6).
- The future mobile app signs in through the same `/api/auth` endpoints (Better Auth's Expo integration).
