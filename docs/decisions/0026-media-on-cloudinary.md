# 0026. Images and payment proofs on Cloudinary (module MED)

- Status: Accepted
- Date: 2026-10-08
- Supersedes: the Cloudflare R2 storage line of BUILD_PROMPT section 3, and the R2 plan in ADR 0013 (the share-image part of ADR 0013 stays)

## Context

Spec v2.1 adds module MED (section 2): organizers upload covers at full quality and see them pixelated. The audit of 2026-10-08 found why:

1. Every image goes through the Next.js optimizer. Next 16 allows only quality 75, and `next.config.ts` serves AVIF first, which Next encodes with sharp at quality 47 and 4:2:0 chroma. A 1920 px cover comes out about three times smaller than a high-quality encode, and text and fine detail smear.
2. The event header uses `sizes="100vw"` in a box with a minimum height and `object-cover`. On a phone the box is nearly square, so the image is drawn wider than the screen and stretched 1.4 to 1.7 times.
3. The demo covers are 1200 px lossy WebP files, stretched 2.4 times on a 2× desktop screen.
4. Share images are drawn from a 1080 px JPEG copy (quality 80), then encoded again.
5. Uploads are written to local disk, which Vercel does not keep: on the live site no cover, logo or payment proof can be uploaded at all.

No upload path re-encodes or resizes before upload; originals are stored byte for byte. The spec chooses Cloudinary (section 2.1).

## Decision

### Provider and environments

- **Cloudinary**, one account created by the founder. Variables use the next-cloudinary names: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server only) and `CLOUDINARY_UPLOAD_FOLDER`: `doulisha/dev` for local work and Vercel Preview, `doulisha/prod` for Vercel Production.
- The app uses Cloudinary as soon as the three keys are set. Without them it keeps the local disk provider, with the same flow and the same database rows, so CI and E2E runs need no keys (founder decision, Q19). Setting only some keys is an error.
- **Free plan limits:** 10 MB per image and 25 megapixels. Uploads are limited to 10 MB instead of the spec's 15 MB (Q30).
- **No Cloudinary package.** Signing uploads (SHA-1 of the sorted parameters followed by the secret, valid one hour), checking upload responses and building delivery URLs are small functions in `packages/storage`, with unit tests.
- No upload preset and no incoming transformation: the signed parameters are the timestamp, the public id, the delivery type and the allowed formats.

### Upload flow (spec 2.3)

1. The browser calls `POST /api/media/sign` with the purpose and the target (event, organizer profile or booking). The server checks the session and that the member may edit that target, then checks the type and size. It returns signed parameters for the public id `<folder>/<purpose>/<userId>/<uuid>`.
2. The browser sends the original `File` to Cloudinary: no canvas, no compression, no resizing.
3. The browser sends Cloudinary's answer to the server, with the SHA-256 of the same bytes (Web Crypto). The server checks the answer's signature (`public_id=…&version=…` followed by the secret), that the public id is one it signed for this member, and that the stored size equals the file size. It then saves a `media` row.
4. Records point at media rows: `events.cover_media_id`, `organizer_profiles.logo_media_id` and `cover_media_id`, `organizer_photos.media_id`, `payment_proofs.media_id`.

### The `media` table

The existing table (used by event wall photos) is extended with **additive** columns only, because the live site still reads the `dev` database (Q26): `provider`, `purpose` (cover, gallery, avatar, logo, proof), `version`, `format`, `bytes`, `checksum_sha256` and `crop`. The existing `key` column holds the Cloudinary public id, and `bucket` is `private` for payment proofs. The old URL columns (`events.cover_url`, …) stay until the live site uses the production database, then a migration removes them.

### Delivery (spec 2.4 and 2.5)

- URLs are built at render time from the media row: `https://res.cloudinary.com/<cloud>/image/upload/<crop>/<resize>/<format and quality>/v<version>/<public id>`. The database never stores a URL.
- Media images are plain `<img srcset sizes>` elements (`MediaImage`), so a Cloudinary image never goes through `/_next/image` (Q5). Static images shipped with the app (logo, hero, demo covers) keep `next/image`.
- **Widths:** the spec ladder 320, 640, 960, 1280, 1920, 2560 plus the slot's own widths, capped at the width of the (cropped) original.
- **Resizing never enlarges:** `c_lfill` (fill, only scaling down) and `c_limit`.

| Slot                               | Crop                                              | Quality       |
| ---------------------------------- | ------------------------------------------------- | ------------- |
| Event page cover (≤ 1,200 px)      | fill 16:9                                         | `q_90:444`    |
| Event card (360 to 420 px)         | fill 4:3                                          | `q_auto:good` |
| Gallery, full screen               | limit                                             | `q_auto:best` |
| Avatar, organizer logo, thumbnails | fill 1:1 (face gravity for avatars)               | `q_auto:good` |
| Share post and story               | fill 1080×1080 and 1080×1920                      | `q_90`        |
| Open Graph                         | fill 1200×630                                     | `q_90`        |
| Organizer page cover (wide banner) | limit (the wide box crops it, never stretches it) | `q_auto:best` |

- **Covers keep full colour detail:** the app cannot tell a poster with text from a photo, so every event cover uses fixed quality 90 without chroma subsampling. Q4 allows fixed 90 for covers and requires `444` for covers with text. Low and eco qualities are never used.
- `f_auto` picks AVIF or WebP with a JPEG fallback; HEIC uploads are converted at delivery. Cloudinary rotates images from their EXIF orientation and strips metadata (GPS included) from transformed images by default; the original keeps its bytes.
- **Crop** is stored as `{ x, y, w, h }` in pixels of the original and applied first (`c_crop`), so the original is never replaced and the crop stays editable.

### Event page header

The cover becomes a 16:9 block at most 1,200 px wide, with the title under it on phones (founder decision, Q31), instead of a full-width box that crops posters.

### Payment proofs (MED-05)

Uploaded as `authenticated` assets under `<folder>/payment-proof/`, so no public URL can open them. `GET /api/proofs/{id}` checks that the viewer is the buyer, an event manager or an admin, then reads the file through Cloudinary's signed private download (valid 60 seconds), server side, and returns it with `cache-control: private, no-store`.

### Share images (Q10)

`/api/og/event` reads the cover from Cloudinary already cut to the output size (1080×1080, 1080×1920 or 1200×630, quality 90), only from `res.cloudinary.com/<our cloud>/`. Satori draws the text on top.

### Tests (MED-06)

- Unit tests: URL builder (Q3, Q4, Q6, crops) and signatures.
- E2E: no `/_next/image` request for a Cloudinary image (T6), delivered width at least twice the rendered width (T3, T4), proof refused to another member (T10).
- A script uploads a 4000×3000 JPEG to the dev folder and checks size and SHA-256 (T1, T2).
- Manual checklist on real phones: T5, T8, T9.

## Consequences

- Covers, logos, organizer photos and payment proofs work on Vercel.
- Each new size of an image counts toward the monthly credits; the preview stays well inside the free plan (spec 2.1). The founder sets a usage alert at 70 %.
- Uploads are limited to 10 MB until a paid plan.
- Demo events keep their static covers in `public/images` (development only; production gets no demo data, Q26).
- Event wall photos (moved to V1 by spec v2.1) stay on the local provider for now.
