import type { Tx } from '@doulisha/db';
import type { PaymentProvider, PaymentProviderId } from '@doulisha/payments';
import type { StorageProvider } from '@doulisha/storage';

/**
 * Infrastructure the services need, injected by the app so the API package
 * never reads environment variables (and tests can pass fakes).
 */
export interface ServiceDeps {
  /** Runs `fn` in a database transaction (WebSocket Pool). */
  transaction: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  payments: Partial<Record<PaymentProviderId, PaymentProvider>>;
  storage: StorageProvider;
  /** Absolute base URL of the web app, e.g. https://doulisha.tn. */
  appUrl: string;
}
