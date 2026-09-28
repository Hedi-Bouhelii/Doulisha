import type { Tx } from '@doulisha/db';
import type { Locale } from '@doulisha/i18n';
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
  /**
   * Sends a message to a buyer (SMS, or email when there is no phone). The app
   * renders the text in the buyer's language. Optional: tests and scripts skip it.
   */
  notify?: (notice: BuyerNotice) => Promise<void>;
}

/** What happened to a booking, for the message sent to its buyer (ADR 0018). */
export interface BuyerNotice {
  kind: 'payment_confirmed' | 'receipt_rejected' | 'reservation_cancelled';
  locale: Locale;
  reference: string;
  eventTitle: string;
  to: { phone: string | null; email: string | null };
  amountMillimes?: number;
  /** For rejected receipts: wrong_amount, unreadable, not_received or other. */
  reason?: string | null;
  note?: string | null;
}
