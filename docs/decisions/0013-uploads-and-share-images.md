# 0013. Uploads by ticket, and share images drawn with Satori

- Status: Accepted
- Date: 2026-09-25

## Context

Organizers upload covers and buyers upload payment receipts (PRT-03). Receipts are personal data. Events need share images in four formats and three languages, Arabic included (SHR-02). Cloudflare R2 arrives in Phase 6.

## Decision

### Uploads (`packages/storage`)

- **Tickets first:** `uploads.create` checks purpose, type and size, then returns a signed upload ticket. The key embeds the purpose and the uploader: `event-cover/{userId}/{uuid}.webp`.
- **Local provider in development:** `PUT /api/uploads/{token}` verifies the HMAC token, the size and the file signature (magic bytes). Public files go to `apps/web/public/uploads`, private ones to `apps/web/.private-uploads` (both gitignored).
- **Private receipts** are served only by `/api/proofs/{id}`, to the buyer or the event's managers, never cached.
- **Covers are keys, not URLs:** forms send `coverKey`; the API accepts only the member's own `event-cover` keys and builds the URL itself (`coverUrlFromKey`). This closed a server-side request forgery path through the share-image route.

### Share images (`/api/og/event`)

- Drawn with `next/og` (Satori) from event data: `og` 1200×630, `post` 1080², `story` 1080×1920, `invitation` 1080×1350, in the event's category colours, returned as JPEG (a few hundred KB, below WhatsApp's preview limit).
- Satori limits handled:
  - fonts must be `ArrayBuffer`s, loaded once from `src/server/og-fonts` (Inter, Playfair Display, IBM Plex Sans Arabic; Amiri fails in Satori's shaper);
  - it reads only PNG and JPEG, so WebP covers are converted with `sharp`;
  - it has no bidirectional layout and measures Arabic letters unjoined: Arabic words are pre-shaped into presentation forms and reversed (`server/og-arabic.ts`, tested), then laid out right to left with a `row-reverse` flexbox.
- Covers are read from `/public` on disk only; the route never fetches a URL. Private events are never rendered.

## Consequences

- Phase 6 adds an R2 provider (presigned `PUT`, public bucket behind a CDN). The share-image route will then need an allow-listed fetch from the R2 public origin.
- Arabic with diacritics renders, but complex ligatures beyond lam-alef are not composed; titles stay readable.
