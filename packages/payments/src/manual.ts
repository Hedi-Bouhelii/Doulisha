import type { PaymentProvider } from './types';

/**
 * Offline payments (PAY-02): cash, bank transfer and D17. Nothing is charged
 * online; the buyer may upload a proof and the organizer marks the payment
 * received (PRT-03). Refunds are handed back by the organizer.
 */
export const manualProvider: PaymentProvider = {
  id: 'manual',
  methods: ['d17', 'cash', 'bank_transfer'],

  createPayment() {
    return Promise.resolve({ kind: 'pending_manual' as const });
  },

  parseWebhook() {
    return Promise.reject(new Error('Manual payments have no webhooks'));
  },

  refund() {
    return Promise.resolve({ providerRef: null });
  },
};
