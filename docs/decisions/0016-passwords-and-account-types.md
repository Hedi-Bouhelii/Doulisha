# 0016. Passwords after a verified code, and participant or organizer at sign-up

- Status: Accepted (founder review of Phase 2, 2026-09-25)
- Date: 2026-09-25
- Supersedes: the "no passwords" and "magic link" parts of ADR 0010

## Context

ADR 0010 used passwordless sign-in only: a new SMS or email for every sign-in. The founder asked for a real sign-up, with a password for the next sign-ins, and for a clear choice between joining events and organizing them. The spec allows it (section on security: "hashed passwords; OTP for phone login"). Every SMS also costs money in Tunisia.

## Decision

- **Sign-up** (`/sign-up`): choose "I join events" or "I organize events", then a phone number or an email, then a 6-digit code. The code creates the account (Better Auth phone-number and email-OTP plugins). Then `/account/setup`: name, city, password (8 to 128 characters, hashed by Better Auth).
- **Sign-in** (`/sign-in`): phone or email with the password. "Receive a code instead" keeps passwordless sign-in as a fallback; accounts without a name or password go through `/account/setup` afterwards (older and seeded accounts).
- **Forgot password** (`/forgot-password`): a code by SMS or email, then a new password (`phone-number/reset-password`, `email-otp/reset-password`).
- **No direct email + password sign-up**: `emailAndPassword.disableSignUp` is on, so every account has a verified phone or email.
- **Magic links are removed**: email uses 6-digit codes, like the phone.
- **Account type**: organizers get an organizer profile at once, prefilled from the account (name, city as region, verified phone and email as contacts), then a three-step onboarding (identity, activity with past-event photos, contact and payment details). Everyone stays a participant too (ACC-05); "Become an organizer" does the same later.
- **Guests who book, then sign up**: the anonymous-account link moves their orders and tickets as well as their RSVPs (orders use `ON DELETE RESTRICT`, which previously blocked the link).
- The password is set with Better Auth's server-only `setPassword`, through `account.completeSignUp`, so the future mobile app uses the same flow.

## Consequences

- One SMS or email per new device or forgotten password instead of one per sign-in.
- Rate limits cover the new endpoints (password sign-in, reset, email codes).
- E2E tests sign seeded accounts in with a code the first time and give them a test password.
- Social sign-in (Google, Facebook, Apple) is unchanged; linking social accounts is discussed separately.
