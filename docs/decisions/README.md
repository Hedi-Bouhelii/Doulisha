# Architecture Decision Records

One file per important decision, numbered in order. An ADR is never edited after it is accepted: to change a decision, write a new ADR that supersedes it.

| #    | Decision                                                                                             | Status                    |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------------- |
| 0001 | [Monorepo with pnpm workspaces and Turborepo](0001-monorepo-pnpm-turborepo.md)                       | Accepted, amended by 0006 |
| 0002 | [Neon PostgreSQL and Drizzle instead of Supabase](0002-neon-drizzle-instead-of-supabase.md)          | Accepted                  |
| 0003 | [tRPC API and Better Auth, served by the Next.js app](0003-trpc-and-better-auth.md)                  | Accepted                  |
| 0004 | [Expo, Expo Router and NativeWind for mobile](0004-expo-mobile.md)                                   | Superseded by 0006        |
| 0005 | [Toolchain versions: TypeScript 6.0 and ESLint 9](0005-toolchain-versions.md)                        | Accepted                  |
| 0006 | [This repository is the web application; mobile has its own repository](0006-web-only-repository.md) | Accepted                  |

## Template

```md
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```
