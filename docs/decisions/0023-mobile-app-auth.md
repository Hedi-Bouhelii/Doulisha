# 0023. Sign-in for the mobile app through Better Auth's Expo plugin

- Status: Accepted (founder "go" on mobile Phase 3, 2026-09-29)
- Date: 2026-09-29

## Context

The mobile app (separate repository, ADR 0006) signs in through the same `/api/auth` endpoints as the web (ADR 0010, 0016, 0019). A React Native app has no browser cookie jar and no web origin: Better Auth would refuse its requests as coming from an untrusted origin, and Google or Facebook sign-in has no way to hand the session back to the app.

## Decision

- **Server plugin:** `expo()` from `@better-auth/expo` is added to `createAuth`, before `nextCookies()` (which must stay last). It reads the app's origin from the `expo-origin` header and, after Google or Facebook sign-in, redirects to the app's deep link with the session.
- **Trusted origins:** `doulisha://` (the app's scheme, OPEN_QUESTIONS Q2) everywhere; the Expo development origins `exp://` and `exp://**` only outside production.
- **Social sign-in runs in the phone's browser** with the existing web OAuth clients, then returns to the app. No Android OAuth client or SHA-1 fingerprint is needed; native Google or Facebook SDK sign-in can come later if wanted.
- **Versions:** `better-auth` and `@better-auth/expo` stay on the same version (1.7.6), since the plugin requires it.

## Consequences

- The app keeps the session cookie in its secure storage and sends it with every tRPC call (`Cookie` header), so the API sees the same session as on the web.
- Implicit account linking stays off (ADR 0019); the app follows the same rules.
