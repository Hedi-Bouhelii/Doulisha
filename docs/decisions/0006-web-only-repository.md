# 0006. This repository is the web application; the mobile app lives in its own repository

- Status: Accepted
- Date: 2026-09-24
- Supersedes: [0004](0004-expo-mobile.md). Amends [0001](0001-monorepo-pnpm-turborepo.md) (node linker).

## Context

The founder asked on 2026-09-24:

- to split the product into separately developed projects ("follow the microservices");
- to make this repository the web application only;
- to remove the Expo app;
- to build the mobile app later, in a separate folder and repository.

The focus for now is the web.

## Decision

- This repository contains `apps/web` (Next.js), which also serves the API (tRPC) and webhooks. It also contains the internal packages (`db`, `api`, `auth`, `validators`, `i18n`, `ui-tokens`, `templates`, `payments`, `notifications`, `config`).
  - The packages keep the domain split into clear modules. A module such as payments or notifications can later be extracted into its own deployable service without rewriting its logic.
  - We do **not** split the backend into separately deployed services now. For a small team before launch, that would add network hops, distributed transactions (booking + payment + stock) and more infrastructure, with no user-facing gain.
- The Expo app, the `expo` ESLint preset and the React Native–specific pnpm settings are removed.
- pnpm goes back to its default **isolated** `node_modules` layout (`nodeLinker: hoisted` was only needed for React Native). This is stricter: a package can no longer import a dependency it has not declared.
- The mobile identifiers are kept for the future mobile repository: `tn.doulisha.app` and the `doulisha://` scheme (confirmed in OPEN_QUESTIONS Q2).
- BUILD_PROMPT Phase 3 (mobile) and the mobile parts of Phase 1 (NativeWind preset, mobile i18n, mobile login) are **out of scope for this repository**.

## Consequences

- The web app ships faster, with a simpler toolchain.
- The future mobile repository cannot import tRPC router types from a workspace package. It will get the API contract in one of two ways, to be decided when mobile starts:
  - a published `@doulisha/api-client` types package;
  - an OpenAPI description generated from the tRPC routers.
- Design tokens (`packages/ui-tokens`) and translations (`packages/i18n`) stay framework-free. The mobile app can then reuse them by publishing or copying them.
- Anything web-only must not leak into those shared packages.
