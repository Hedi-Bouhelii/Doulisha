# 0012. Payment providers behind one interface, with a double-entry ledger

- Status: Accepted
- Date: 2026-09-25

## Context

Tunisian buyers pay online (Konnect, Flouci), by D17 or bank transfer with a receipt, or in cash at the door (PAY-01..04). Real gateway credentials arrive in Phase 6, and CLAUDE.md requires mocks in development. Deposits, balances, refunds and organizer payouts must add up.

## Decision

- **`packages/payments`** defines a provider interface. Two providers exist now:
  - `mock`: a simulated gateway page (`/checkout/mock-pay`, 404 in production) that posts an HMAC-signed webhook (`x-mock-signature`) to `/api/payments/mock/webhook`. The secret is derived from `BETTER_AUTH_SECRET`, so no new secret is needed.
  - `manual`: D17, transfer and cash; the organizer confirms (`markPaid`) or approves an uploaded receipt (`reviewProof`).
- **Webhooks are idempotent:** a payment event is applied once, whatever the number of deliveries (`handlePaymentEvent`).
- **Ledger:** every payment and refund writes balanced entries (`paymentEntries`, `refundEntries`, `isBalanced` in `domain/ledger.ts`). Online money sits on a `gateway:{provider}` account on behalf of `organizer:{id}`; cash, transfer and D17 go to `organizer:{id}:direct`, since the organizer already holds them. Platform fees come with the pricing plans (ORG-02). Amounts are integer millimes.
- **Refunds:** policy computed by `refund-policy.ts` (flexible 24 h, moderate 7 days, strict none; organizer cancellation refunds in full). Requests go to the organizer (`decideRefund`).

## Consequences

- Phase 6 adds Konnect and Flouci as new providers behind the same interface, selected by `PAYMENT_PROVIDER`; the booking code does not change.
- Commission and payout rules can be computed from the ledger (Phase 5) instead of from order totals.
- The mock page must stay unreachable in production; it returns 404 when `NODE_ENV` is `production`.
