import type { AppRouter } from '@doulisha/api';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

/** Types of every procedure's output, e.g. `RouterOutputs['booking']['options']`. */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
