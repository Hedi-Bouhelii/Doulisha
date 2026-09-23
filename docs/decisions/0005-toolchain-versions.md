# 0005. Toolchain versions: TypeScript 6.0 and ESLint 9

- Status: Accepted
- Date: 2026-09-23

## Context

The build prompt asks for the latest stable versions. In September 2026 those are TypeScript 7.0 (the native Go compiler) and ESLint 10. Three constraints prevent using them:

- **typescript-eslint:** version 8.70 supports only `typescript >=4.8.4 <6.1.0`. With TypeScript 7, the type-aware lint rules would break. One of them, `no-floating-promises`, matters for payment code.
- **Expo:** SDK 57 ships with `typescript ~6.0.3`.
- **ESLint 10:** `eslint-config-next` depends on `eslint-plugin-react`, which supports ESLint only up to 9.x.

## Decision

- **TypeScript:** `~6.0.3` everywhere, through the pnpm catalog.
- **ESLint:** `^9.39` with flat config. The shared presets live in `packages/config/eslint` (`base`, `next`, `expo`).
- **Everything else:** the latest stable version at setup time:
  - pnpm 12.6;
  - Turborepo 2.11;
  - Vitest 5;
  - Next.js 16.3;
  - React 19.2;
  - Tailwind CSS 4.3;
  - Expo SDK 57;
  - Zod 4;
  - Prettier 3.

## Consequences

- We give up TypeScript 7's faster type-checking for now.
- Revisit when `typescript-eslint` supports TypeScript 7 and `eslint-config-next` supports ESLint 10. The change will get a new ADR that supersedes this one.
