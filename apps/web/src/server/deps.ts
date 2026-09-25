import 'server-only';

import { createHmac } from 'node:crypto';

import type { ServiceDeps } from '@doulisha/api';
import { withTransaction } from '@doulisha/db';
import { createMockProvider, manualProvider } from '@doulisha/payments';
import { createLocalProvider } from '@doulisha/storage';

import { getServerEnv } from '@/env';

/**
 * Secrets for the mock gateway and local uploads, derived from the auth secret
 * so local setup needs no extra variables. Real providers get their own keys.
 */
export function derivedSecret(purpose: 'mock-payments' | 'uploads') {
  return createHmac('sha256', getServerEnv().BETTER_AUTH_SECRET).update(purpose).digest('hex');
}

let deps: ServiceDeps | undefined;

/** Infrastructure injected into the API services (see packages/api/src/deps.ts). */
export function getServiceDeps(): ServiceDeps {
  if (deps) return deps;
  const env = getServerEnv();
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  deps = {
    transaction: (fn) => withTransaction(env.DATABASE_URL, fn),
    payments: {
      mock: createMockProvider({
        secret: derivedSecret('mock-payments'),
        gatewayUrl: (input, providerRef) =>
          `${appUrl}/${input.locale}/checkout/mock-pay?payment=${input.paymentId}&ref=${encodeURIComponent(providerRef)}&amount=${input.amountMillimes}&order=${input.orderReference}`,
      }),
      manual: manualProvider,
    },
    storage: createLocalProvider({ secret: derivedSecret('uploads') }),
    appUrl,
  };
  return deps;
}

/** The mock provider with its webhook builder (for the simulated gateway page). */
export function getMockPayments() {
  return createMockProvider({ secret: derivedSecret('mock-payments'), gatewayUrl: () => '' });
}
