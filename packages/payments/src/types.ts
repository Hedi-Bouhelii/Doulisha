/** Providers from BUILD_PROMPT section 3. Konnect and Flouci arrive in Phase 6. */
export type PaymentProviderId = 'mock' | 'manual' | 'konnect' | 'flouci';

/** PAY-02 methods. Online: card, e-Dinar. Offline: D17, cash, bank transfer (with proof). */
export type PaymentMethod = 'card' | 'e_dinar' | 'd17' | 'cash' | 'bank_transfer';

export interface CreatePaymentInput {
  /** Our payment row id; the provider echoes it back in webhooks. */
  paymentId: string;
  orderReference: string;
  amountMillimes: number;
  method: PaymentMethod;
  /** Where the buyer returns after paying online. */
  returnUrl: string;
  locale: 'ar' | 'fr' | 'en';
}

export type CreatePaymentResult =
  /** Online: send the buyer to the gateway. */
  | { kind: 'redirect'; url: string; providerRef: string }
  /** Offline: the organizer confirms later (cash, transfer, D17 with proof). */
  | { kind: 'pending_manual' };

/** A verified event from a provider webhook. */
export interface PaymentEvent {
  paymentId: string;
  providerRef: string;
  status: 'succeeded' | 'failed';
  amountMillimes: number;
  /** Unique per event, so a replayed webhook is processed once. */
  eventId: string;
}

export interface RefundInput {
  paymentId: string;
  providerRef: string | null;
  amountMillimes: number;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** Methods this provider handles. */
  readonly methods: readonly PaymentMethod[];
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /**
   * Verifies a webhook's signature and parses it. Throws on an invalid
   * signature; never trust a webhook body before this returns.
   */
  parseWebhook(body: string, headers: Headers): Promise<PaymentEvent>;
  /** Sends money back. Manual refunds are done by the organizer outside Doulisha. */
  refund(input: RefundInput): Promise<{ providerRef: string | null }>;
}

export class InvalidWebhookError extends Error {
  constructor(message = 'Invalid webhook signature') {
    super(message);
    this.name = 'InvalidWebhookError';
  }
}
