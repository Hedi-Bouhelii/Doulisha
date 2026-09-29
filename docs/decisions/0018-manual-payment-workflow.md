# 0018. Manual payments: reservations with a deadline, a payments inbox, cash collected at the door

- Status: Accepted (founder review, 2026-09-28)
- Date: 2026-09-28

## Context

D17 and bank transfers are paid outside Doulisha: the buyer sends money, then a receipt, and the organizer checks it. The first version had three problems the founder found:

- the ticket page showed a QR code before any money arrived, so a buyer could enter with an unchecked (or missing) payment;
- receipts were reviewed from a tab inside each event, with little information and no way to tell the buyer what was wrong;
- "Mark as paid" in the attendee list could confirm an order while its receipt was still waiting for review.

Ticketing tools that accept offline payments (Ticket Tailor, Hi.Events, EventNook, Eventify) share one pattern: the order is **reserved, not issued**, until the organizer confirms payment; reservations expire after a set time; organizers work from **one list of payments to confirm**, with the expected amount next to the proof; a refusal tells the buyer why.

## Decision

- **Reservation, not ticket.** A D17 or transfer booking holds its places (`bookings.status = 'held'`) with a deadline in `hold_expires_at`. QR codes, and so the PDF ticket, exist only for confirmed places. Cash at the door keeps the QR code: the place is confirmed and the money is collected at check-in.
- **Deadline** (`domain/payment-deadline.ts`): 48 hours to pay, but never later than 12 hours before the event, and never less than 2 hours (or the start, if sooner). Sending a receipt **pauses** the deadline (set to null) until the organizer decides. A refused receipt restarts it with 24 hours to send another. The organizer can add one day at a time, never past the start. The founder approved these values (OPEN_QUESTIONS Q25, 2026-09-28).
- **Expiry.** Reservations past their deadline are released like online holds (ADR 0011): lazily, inside the stock lock, when anyone books the event or the organizer opens their payments. The places go to the waitlist. The buyer's page shows "expired" as soon as the deadline passes, even before the release.
- **Payments inbox** (`/organizer/payments`, and a "Payments" tab on each event) with three lists:
  - **To verify:** receipts waiting for review, each with the buyer, phone, event, reference, method, expected amount and the receipt shown inline (image, or a PDF link). Actions: confirm (with an optional D17 or bank transaction number), or refuse with a reason (`wrong_amount`, `unreadable`, `not_received`, `other`) and a note for the buyer.
  - **Awaiting payment:** D17 and transfer reservations without a receipt, with their deadline. Actions: mark as paid (the organizer confirms the amount and can add the transaction number), one more day, cancel the reservation (places released, buyer told).
  - **Confirmed:** manual payments of the last 30 days, with the transaction number.
  - A badge on the "Payments" link and a banner on the dashboard count the receipts to verify.
- **One way through a receipt.** `recordManualPayment` refuses (`errors.proofPending`) while a receipt is pending, so the attendee list shows "Verify the receipt" instead of "Mark as paid" for those orders.
- **Buyer messages.** Confirmation, refusal (reason and note) and cancellation are sent by SMS when the buyer has a phone, otherwise by email, in the language of the booking (`orders.locale`), through `ServiceDeps.notify`. Development uses the mock senders.
- **Payment instructions** ask the buyer to write their booking reference in the D17 or transfer message, so the organizer can match the money.
- **Cash at the door.** Scanning an unpaid cash ticket answers "Collect X DT from {name}" with one button "Collected, check in", which records the cash payment and checks the person in.
- **Guest PDF (Q23).** The PDF downloads automatically once per browser, as soon as the ticket exists: at booking for online and cash, when the organizer confirms for D17 and transfer (remembered in local storage instead of session storage).

## Consequences

- An organizer can no longer let someone in on a D17 or transfer booking that was not confirmed; they confirm the payment first (from the inbox or the attendee list).
- A reservation that is never paid frees its places on its own, without the organizer.
- The rules live in services with unit tests (`payment-deadline.test.ts`) and an integration test on a Neon branch (`manual-payment.int.test.ts`); the full flow is covered end to end (`e2e/payments.spec.ts`).
- Receipt matching stays manual. Real D17 or bank integrations (Phase 6) can confirm payments automatically through the same `applySucceededPayment` path.
