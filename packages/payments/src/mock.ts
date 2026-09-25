import { randomUUID } from 'node:crypto';

import { sign, verify } from './signature';
import {
  InvalidWebhookError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentEvent,
  type PaymentProvider,
} from './types';

export const MOCK_SIGNATURE_HEADER = 'x-mock-signature';

export interface MockProviderOptions {
  /** Shared secret for webhook signatures (development only). */
  secret: string;
  /**
   * Builds the URL of the simulated gateway page, where the buyer chooses
   * "pay" or "fail". The web app serves it at /[locale]/checkout/mock-pay.
   */
  gatewayUrl: (input: CreatePaymentInput, providerRef: string) => string;
}

export interface MockWebhookBody {
  paymentId: string;
  providerRef: string;
  status: 'succeeded' | 'failed';
  amountMillimes: number;
  eventId: string;
}

/**
 * Simulated online gateway for development and tests (BUILD_PROMPT: mocks
 * until Phase 6). It behaves like Konnect/Flouci: redirect to a payment page,
 * then a signed webhook tells us the result.
 */
export function createMockProvider({ secret, gatewayUrl }: MockProviderOptions): PaymentProvider & {
  /** Builds the signed webhook the simulated gateway page sends. */
  buildWebhook(body: Omit<MockWebhookBody, 'eventId'>): { body: string; signature: string };
} {
  return {
    id: 'mock',
    methods: ['card', 'e_dinar'],

    createPayment(input): Promise<CreatePaymentResult> {
      const providerRef = `mock_${randomUUID()}`;
      return Promise.resolve({
        kind: 'redirect',
        url: gatewayUrl(input, providerRef),
        providerRef,
      });
    },

    parseWebhook(body, headers): Promise<PaymentEvent> {
      if (!verify(body, headers.get(MOCK_SIGNATURE_HEADER), secret)) {
        return Promise.reject(new InvalidWebhookError());
      }
      const parsed = JSON.parse(body) as MockWebhookBody;
      return Promise.resolve({
        paymentId: parsed.paymentId,
        providerRef: parsed.providerRef,
        status: parsed.status,
        amountMillimes: parsed.amountMillimes,
        eventId: parsed.eventId,
      });
    },

    refund() {
      return Promise.resolve({ providerRef: `mock_refund_${randomUUID()}` });
    },

    buildWebhook(fields) {
      const body = JSON.stringify({ ...fields, eventId: `evt_${randomUUID()}` });
      return { body, signature: sign(body, secret) };
    },
  };
}
