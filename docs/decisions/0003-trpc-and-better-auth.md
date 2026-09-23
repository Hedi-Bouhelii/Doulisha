# 0003. tRPC API and Better Auth, served by the Next.js app

- Status: Accepted
- Date: 2026-09-23

## Context

Web, mobile and admin all need the same typed API. The spec lists phone OTP, email, Google, Facebook and Apple login, and lets guests RSVP without an account (ACC-01, INV-02).

## Decision

- **API:** tRPC routers live in `packages/api` and are served by the Next.js app (`apps/web`).
  - Inputs are validated with Zod schemas from `packages/validators`.
  - The only public REST endpoints are payment webhooks and Open Graph images.
- **Layering:** UI → tRPC router → service → Drizzle. Routers stay thin. Business rules (capacity, waitlist, refunds, permissions) live in services and are unit-tested.
- **Auth:** Better Auth, with the Drizzle adapter on Neon, configured once in `packages/auth`. It provides:
  - phone OTP, with a mock SMS sender in development;
  - email magic link;
  - Google, Facebook and Apple sign-in;
  - mobile sessions through its Expo integration;
  - lightweight guest sessions for RSVP.

## Consequences

- **Types:** types flow from the database to both clients without code generation.
- **Deployment:** there is only one backend to deploy (Vercel). Long-running work goes to background jobs; Inngest is the planned tool, confirmed in a later ADR.
- **Partner API:** a future public API for partners (the spec's "Club / agency" plan) would need a REST or OpenAPI layer on top of the services.
