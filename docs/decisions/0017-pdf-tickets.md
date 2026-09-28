# 0017. PDF tickets drawn with next/og and assembled with pdf-lib

- Status: Accepted (founder decision on OPEN_QUESTIONS Q23, 2026-09-28)
- Date: 2026-09-28

## Context

Guests book without an account; the founder asked that their ticket be downloaded as a PDF, well presented with the logo, the event details and the QR code, in the language of the interface. The PDF must render Arabic correctly and stay small enough for a serverless function (no headless browser).

## Decision

- **Route:** `GET /api/tickets/{reference}/pdf?locale=` reads the order through the same `booking.byReference` procedure as the ticket page, so only the buyer's session (member or guest) gets it. It answers 409 while no place is confirmed (no QR code yet).
- **One A4 page per person**, drawn at 150 dpi with `next/og` (Satori): logo, "E-ticket" badge, cover, title, organizer, date and time (Tunisia), place, pick-up point, holder, ticket type, reference, payment status, a 420 px QR code with its code, and the entrance instructions. Arabic uses the shaping and right-to-left layout of the share images (ADR 0013), shared in `src/server/og-kit.tsx`.
- **pdf-lib** puts the JPEG pages into a PDF with a title, author and language. About 150–300 KB per page.
- **Delivery:** guests get the file automatically once, right after booking or paying (remembered per booking in session storage), and a "Download my ticket (PDF)" button stays on the ticket page for everyone. ADR 0018 changes this to once per browser, as soon as the places are confirmed (D17 and transfer tickets exist only after the organizer confirms the payment).

## Consequences

- The text in the PDF is an image: it cannot be selected or read aloud. The ticket page remains the accessible version; a text layer can be added later if needed.
- The layout lives in one route and is tested end to end (download, content type, refusal for others).
