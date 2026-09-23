# 0004. Expo, Expo Router and NativeWind for mobile

- Status: Accepted
- Date: 2026-09-23

## Context

The spec asks for:

- Android first, then iOS;
- the same TypeScript as the web;
- over-the-air updates;
- an app under 40 MB;
- offline tickets and check-in.

## Decision

- **Framework:** **Expo** (SDK 57, React Native 0.86).
  - **Expo Router** for file-based routes and deep links; Android App Links arrive in Phase 3.
  - Builds run on **EAS Build**.
- **Styling:** **NativeWind**, sharing the web's Tailwind tokens through `packages/ui-tokens`.
- **Libraries:** Reanimated, Gesture Handler, FlashList, expo-image and bottom sheets.
- **Push notifications:** **Expo push notifications**, which use FCM on Android.
  - Spec section 9 suggests calling Firebase Cloud Messaging directly.
  - Expo push keeps a single API for Android and iOS.
- **i18n:** `i18next` with `expo-localization`, and RTL through `I18nManager`.
- **Starting point:** the app was generated with `create-expo-app` (default template), and its demo screens were removed.

## Consequences

- **Shared code:** mobile reuses the tRPC API and Zod schemas from the web.
- **RTL switch:** switching to Arabic on Android requires reloading the app, a known React Native limitation. Phase 1 handles this in the language switcher.
- **Template defaults kept:** the default template enables `typedRoutes` and the React Compiler, and we keep both.
