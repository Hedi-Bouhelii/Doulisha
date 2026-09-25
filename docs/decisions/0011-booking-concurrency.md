# 0011. Booking concurrency: row locks, holds and a lazy waitlist

- Status: Accepted
- Date: 2026-09-25

## Context

Popular events sell out in minutes (spec, peak-load requirement). Two people must never get the last place, unpaid online bookings must not block places forever, and freed places go to the waitlist in order (PRT-04). Neon's HTTP driver cannot hold a transaction open, and there is no job runner yet.

## Decision

- **One transaction per stock change**, on the Neon WebSocket `Pool` (`withTransaction`), starting with `SELECT … FROM events … FOR UPDATE` (`lockEventStock`). Every stock change goes through it: booking, cancel, refund, expiry, manual attendee, event cancellation.
- **Lock order:** the event first, then the order. Payment callbacks read the order without a lock, lock the event, then lock the order, so two paths can never wait on each other.
- **Holds:** an online booking holds its places for 15 minutes (`HOLD_MINUTES`); manual methods keep them until the organizer confirms or cancels.
- **Waitlist:** when the event is full, bookings join the waitlist with a position. Freed places are offered in order and an offer stays open 24 hours (`OFFER_HOURS`).
- **No cron:** expired holds and offers are released at the start of the next locked transaction on the same event (`releaseExpired`), before availability is computed. The outcome is the same as a timer, without a scheduler.
- **Idempotency:** `booking.create` takes a client key, so a retried request returns the same order.
- **Proof:** `src/integration/booking-concurrency.int.test.ts` fires 50 parallel bookings at a 10-place event on the Neon `dev` branch: exactly 10 succeed and 40 are refused. With the waitlist on, the 40 get positions 1 to 40.

## Consequences

- Throughput per event is limited by one row lock, which is fine for events of a few hundred places. Very large events would need per-ticket-type stock rows.
- Expired holds stay counted until someone touches the event. Listings show a few places fewer for up to one booking attempt; a scheduled sweep can be added with notifications (Phase 4).
- Integration tests need a real database and are excluded from `pnpm test` (`pnpm --filter @doulisha/api test:integration`).
