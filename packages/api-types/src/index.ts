/**
 * @doulisha/api-types: the API contract for clients outside this repository
 * (the mobile app, ADR 0006 and ADR 0024). `pnpm build` bundles these types
 * into `dist/index.d.ts`, with every internal type inlined.
 */
import type { AppRouter } from '@doulisha/api';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export type { AppRouter };

/** Input of every procedure, e.g. `RouterInputs['events']['upcoming']`. */
export type RouterInputs = inferRouterInputs<AppRouter>;

/** Output of every procedure, e.g. `RouterOutputs['booking']['byReference']`. */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
