# 0019. Social sign-in, explicit account linking, story sharing and draft legal pages

- Status: Accepted (founder decision on OPEN_QUESTIONS Q24, 2026-09-29)
- Date: 2026-09-29
- Amends: ADR 0010 (account linking), ADR 0016 (password step)

## Context

The spec lists Google, Facebook and Apple sign-in as MVP (ACC-01), sharing to Instagram and TikTok as MVP (SHR-01, section 9.2), and direct publishing to Facebook Pages and Instagram as V1 (SHR-05). Better Auth already had the providers wired (ADR 0010) but no keys, no buttons on sign-up, and no way to see or manage connected accounts. Every new account had to choose a password (ADR 0016).

Doulisha is not a registered company yet. Meta's business verification, needed for publishing on someone's behalf, is out of reach; plain sign-in is not. Google and Meta ask for a privacy policy and a way to request data deletion, and Facebook does not say whether an email address was verified.

## Decision

- **Scope now:** Google and Facebook sign-in and sign-up, a "My account → Sign-in methods" page, story sharing through the phone's share sheet, and draft Privacy, Terms and data deletion pages. Direct publishing (SHR-05) waits until Doulisha is a company; TikTok publishing waits for TikTok's audit; Apple waits for the iPhone app.
- **Buttons** appear on sign-in and sign-up only for providers whose keys are set. On sign-up, the participant or organizer choice travels in `newUserCallbackURL`, so a new Google or Facebook account lands on `/account/setup?welcome=1&type=…`.
- **No password for social accounts:** `account.status.needsSetup` no longer asks for a password when a Google or Facebook account is connected; setup still asks for the city and the account type. A password can be added later in "My account".
- **Linking only on purpose.** `accountLinking.disableImplicitLinking` is on: signing in with Google or Facebook never attaches to an existing account because the email matches. The person gets a message (`?error=account_not_linked`) telling them to sign in their usual way and connect the provider from "My account". There, `linkSocial` attaches it while they are signed in; providers are listed as trusted and `allowDifferentEmails` is on so that this explicit link works whatever the provider says about the email.
- **Facebook without an email** (accounts made with a phone number) gets a placeholder `{id}@facebook.doulisha.invalid`, like phone-only accounts. `isPlaceholderEmail` in `@doulisha/validators` recognises every `*.doulisha.invalid` address, so no message is ever sent to one.
- **Removing a provider** goes through our own `account.unlinkProvider`, which refuses the last way in (`errors.lastSignInMethod`). Better Auth's own rule only counts its account rows and would miss phone and email codes, which have none. The rule (`canRemoveProvider`) counts a verified phone, a real email, a password and the other providers.
- **Story sharing:** the images dialog fetches the post, story and invitation images when it opens and, where the browser can share files, a "Share" button hands the image and the tracked link (`utm_source=story`, `post` or `invitation`) to the share sheet in the same tap (Safari refuses a share that waits for a download). Elsewhere the image downloads and the link is copied.
- **Legal pages:** `/privacy`, `/terms` and the new `/data-deletion` render structured drafts from `src/content/legal.ts` in three languages. They name Doulisha as the service and the founder's address as the contact, describe what the app really stores and which providers process data, and say plainly that they are drafts to be reviewed before the public launch.

## Consequences

- Real Google and Facebook sign-in cannot run in automated tests. E2E tests stop at the provider's door and check what Doulisha sends it; the unlink rule has unit and integration tests; the founder tries the real flows (docs/SOCIAL_SIGN_IN_SETUP.md).
- Someone who first signed up with a code and later taps "Continue with Google" gets a message instead of being signed in. That is the price of never linking on an unverified email.
- On the live site, SMS and email codes are not sent until Phase 6, so Google and Facebook are the only way to create an account there for now.
- Better Auth stores the providers' access tokens with the account rows. They are used only for sign-in; nothing is read from or posted to the person's Google or Facebook account.
