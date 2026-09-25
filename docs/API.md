# API

The Doulisha API is **tRPC** (`packages/api`), served by the Next.js app at `/api/trpc` (ADR 0003). Server components call the same procedures in process through `api()` in `apps/web/src/trpc/server.ts`; client components use `useTRPC()` with TanStack Query.

## Conventions

- **Layering:** router (input validation, thin) → service (business rules, permissions) → Drizzle.
- **Transformer:** superjson (dates arrive as `Date`).
- **Locale:** clients send `x-doulisha-locale: ar | fr | en`; services return names in that language.
- **Auth context:** `ctx.session` (Better Auth) and `ctx.actor` `{ userId, roles, isAnonymous }`.
- **Procedures:** `publicProcedure`, `protectedProcedure` (signed-in members; guests refused), `roleProcedure(...roles)` (admins pass every role check).

## Error format

Services throw `AppError(code, messageKey, details?)`; the formatter returns:

```json
{
  "message": "errors.forbidden",
  "code": -32603,
  "data": {
    "code": "FORBIDDEN",
    "httpStatus": 403,
    "path": "admin.tables",
    "fieldErrors": { "limit": ["Too big"] },
    "details": {}
  }
}
```

- `message` is a key in the `Errors` messages of `@doulisha/i18n` (clients translate it). Unexpected errors always read `errors.internal`; internals are never leaked.
- `fieldErrors` lists invalid input fields (Zod).

## Routers and procedures

Access: **public** (anyone, guests included), **member** (`protectedProcedure`: signed in, not a guest), **manager** (member who created the event, owns its organizer profile, or is an admin; checked in the service), **admin**.

### Discovery

| Procedure            | Type  | Access | Description                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health.ping`        | query | public | Liveness check; returns `{ ok, time }`.                                                                                                                                                                                                                                                                                                                                       |
| `me.get`             | query | public | The signed-in user with roles, or `null`. Guests have `isAnonymous: true`.                                                                                                                                                                                                                                                                                                    |
| `catalog.categories` | query | public | Active categories in display order, localized.                                                                                                                                                                                                                                                                                                                                |
| `catalog.cities`     | query | public | Cities with upcoming public events (search city picker).                                                                                                                                                                                                                                                                                                                      |
| `events.upcoming`    | query | public | Upcoming public events, soonest first. Input: `limit` (1–50), `categorySlug?`, `query?` (accent-insensitive), `city?`, `when?` (`today`, `tonight`, `weekend`, `week`, `month`, Tunisia time), `price?` (`free`, `paid`), `maxPriceMillimes?`, `audience?`, `available?`, `near?` (`lat`, `lng`, `radiusKm`). Never returns private, unlisted, draft, deleted or past events. |
| `events.bySlug`      | query | public | One event page. Public and unlisted events only; private events and drafts return `NOT_FOUND` (TRS-06). Includes `bookingOpen`, `waitlistEnabled` and `canManage` for the viewer.                                                                                                                                                                                             |
| `events.sitemap`     | query | public | Slugs and update times of public upcoming events, for `sitemap.xml`.                                                                                                                                                                                                                                                                                                          |
| `organizers.bySlug`  | query | public | Public organizer page (ACC-03): profile, contacts, social links, past-event photos and upcoming public events. Payment details are never returned.                                                                                                                                                                                                                            |

### Account (ACC-01, ACC-05, ADR 0016)

| Procedure                 | Type     | Access | Description                                                                                                                         |
| ------------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `account.status`          | query    | member | Whether the account still needs a name or a password (`needsSetup`), plus `hasPassword` and `isOrganizer`.                          |
| `account.completeSignUp`  | mutation | member | Last sign-up step: name, city, password (unless one exists) and `accountType`. Organizers get a profile prefilled from the account. |
| `account.setPassword`     | mutation | member | Adds a password to an account that has none.                                                                                        |
| `account.becomeOrganizer` | mutation | member | Creates the prefilled organizer profile and grants the role ("Become an organizer").                                                |

### Booking and tickets (TKT, PAY)

| Procedure             | Type     | Access | Description                                                                                                                                                                                                                                                    |
| --------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `booking.options`     | query    | public | Checkout options of an event: ticket types with places left, meeting points, questions, allowed payment methods, deposit rules.                                                                                                                                |
| `booking.create`      | mutation | public | Books places (guests get an anonymous session first). Locks the event stock (`SELECT … FOR UPDATE`), holds places 15 minutes, or joins the waitlist when full. Idempotent on `idempotencyKey`. Returns the reference and, for online payment, the gateway URL. |
| `booking.mine`        | query    | public | Orders of the current member or guest.                                                                                                                                                                                                                         |
| `booking.byReference` | query    | public | One own order: status, payments, tickets with QR codes once confirmed, refund if cancelled. For D17 or transfer, `payTo` holds only the chosen method's details (D17 number or RIB); `paymentMethods` lists the others the event accepts.                      |
| `booking.payOnline`   | mutation | public | Starts (or restarts) an online payment for the amount due; returns the gateway URL.                                                                                                                                                                            |
| `booking.attachProof` | mutation | public | Attaches an uploaded transfer or D17 receipt (private storage) to the pending manual payment.                                                                                                                                                                  |
| `booking.cancel`      | mutation | public | Cancels the buyer's booking under the event's refund policy (flexible 24 h, moderate 7 days, strict none) and frees the places for the waitlist.                                                                                                               |

### Organizer (ORG, EVT, PRT, LOG)

| Procedure                 | Type     | Access  | Description                                                                                                                                                                       |
| ------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor.templates`        | query    | member  | Active templates for the "what are you organizing" picker.                                                                                                                        |
| `editor.myEvents`         | query    | member  | Events the member created or publishes through one of their organizer profiles, drafts included.                                                                                  |
| `editor.create`           | mutation | member  | New draft from a template, prefilled (policy, brief, registration type) in the chosen language.                                                                                   |
| `editor.get`              | query    | manager | Everything the wizard edits, plus the publish checks (`problems`).                                                                                                                |
| `editor.update`           | mutation | manager | Auto-saved event fields. `details` is validated against the template; `coverKey` must be the member's own `event-cover` upload.                                                   |
| `editor.setTickets`       | mutation | manager | Replaces the ticket types; types that already sold are deactivated, not deleted.                                                                                                  |
| `editor.setMeetingPoints` | mutation | manager | Replaces the pick-up points (LOG-01).                                                                                                                                             |
| `editor.setProgramme`     | mutation | manager | Replaces the programme steps (EVT-06).                                                                                                                                            |
| `editor.setQuestions`     | mutation | manager | Replaces the booking questions (TKT-03).                                                                                                                                          |
| `editor.publish`          | mutation | manager | Publishes a draft if nothing is missing; otherwise returns the problems. Gives the event its final slug.                                                                          |
| `editor.duplicate`        | mutation | manager | Copies an event (details, tickets, questions, programme) as a new draft; a past date moves to tomorrow. Pick-up points are not copied: their times belong to the old date.        |
| `organizer.profiles`      | query    | member  | The member's organizer profiles.                                                                                                                                                  |
| `organizer.createProfile` | mutation | member  | Creates an organizer profile (name, bio, legal status, categories, regions, social links, contacts, payment details, logo and cover upload keys) and grants the `organizer` role. |
| `organizer.updateProfile` | mutation | member  | Edits an own profile.                                                                                                                                                             |
| `organizer.myProfile`     | query    | member  | The member's organizer profile with its photos, payment details and contacts (null if none).                                                                                      |
| `organizer.addPhoto`      | mutation | member  | Adds an uploaded `organizer-photo` to the gallery (at most 12).                                                                                                                   |
| `organizer.removePhoto`   | mutation | member  | Removes a gallery photo.                                                                                                                                                          |
| `organizer.dashboard`     | query    | member  | ORG-01 figures: upcoming events, fill rate, collected and pending amounts, bookings by UTM source.                                                                                |
| `organizer.attendees`     | query    | manager | PRT-01 list: one row per person with ticket, payment status, answers, notes, proofs, refund requests and check-in.                                                                |
| `organizer.sources`       | query    | manager | Bookings of one event by UTM source (SHR-04).                                                                                                                                     |
| `organizer.addAttendee`   | mutation | manager | PRT-02 booking taken by phone or WhatsApp, same stock rules, optionally already paid.                                                                                             |
| `organizer.setNote`       | mutation | manager | Private note on an attendee.                                                                                                                                                      |
| `organizer.markPaid`      | mutation | manager | PRT-03 cash, transfer or D17 received for an order (ledger entries written).                                                                                                      |
| `organizer.reviewProof`   | mutation | manager | Approves (records the payment) or rejects an uploaded receipt.                                                                                                                    |
| `organizer.decideRefund`  | mutation | manager | PAY-04 approves or rejects a refund request.                                                                                                                                      |
| `organizer.checkIn`       | mutation | manager | TKT-05 check-in by ticket code: `checked_in` (with payment status), `already` (with time) or `invalid`.                                                                           |
| `organizer.cancelEvent`   | mutation | manager | Cancels the event and refunds every paid order in full.                                                                                                                           |

### Private events (INV)

| Procedure                 | Type     | Access  | Description                                                                                                                                                                    |
| ------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `invitations.quickCreate` | mutation | member  | INV-01 private event in one step, published at once with a link invitation. The host is on the list as "going".                                                                |
| `invitations.link`        | query    | manager | The event's link invitation token, created on demand.                                                                                                                          |
| `invitations.hosted`      | query    | member  | The member's private events with their link tokens.                                                                                                                            |
| `invitations.byToken`     | query    | public  | INV-02 invitation page. The guest list is returned only to the host and to guests who answered; dietary notes only to the host; a hidden address only to guests who are going. |
| `invitations.respond`     | mutation | public  | INV-03 answer (going, maybe, not going, +1s, food notes). Guests without an account give a name.                                                                               |

### Uploads and admin

| Procedure              | Type     | Access | Description                                                                                                                                                                                                                              |
| ---------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploads.create`       | mutation | public | Upload ticket for `event-cover`, `event-photo`, `organizer-cover`, `organizer-photo` (public, 5 MB), `organizer-logo` (public, 2 MB) or `payment-proof` (private, 8 MB, PDF allowed). Type and size are checked before any byte is sent. |
| `admin.tables`         | query    | admin  | Row counts of the tables the data explorer may show.                                                                                                                                                                                     |
| `admin.rows`           | query    | admin  | Latest rows of one table. Secrets and sensitive data are never exposed.                                                                                                                                                                  |
| `admin.templates`      | query    | admin  | Every template, active or not (EVT-09).                                                                                                                                                                                                  |
| `admin.updateTemplate` | mutation | admin  | Saves a template definition (validated with `templateDefinitionSchema`) and its activation, as a new version.                                                                                                                            |

## Other HTTP endpoints

| Endpoint                                | Description                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/auth/*`                           | Better Auth (ADR 0016): `phone-number/send-otp`, `phone-number/verify`, `sign-in/phone-number` (password), `sign-in/email` (password), `email-otp/send-verification-otp`, `sign-in/email-otp`, `phone-number/request-password-reset`, `phone-number/reset-password`, `email-otp/reset-password`, `sign-in/social`, `sign-in/anonymous`, `get-session`, `sign-out`… |
| `/api/dev/outbox`                       | Development only (404 in production): mock SMS and emails. `GET` lists, `DELETE` clears.                                                                                                                                                                                                                                                                           |
| `POST /api/payments/mock/webhook`       | Mock gateway callback, HMAC-signed (`x-mock-signature`) and idempotent. Replaced by Konnect/Flouci in Phase 6.                                                                                                                                                                                                                                                     |
| `PUT /api/uploads/{token}`              | Receives a file for an upload ticket (signed token, size and file signature checked). Local storage in development; R2 presigned URLs in Phase 6.                                                                                                                                                                                                                  |
| `GET /api/proofs/{id}`                  | A payment receipt, to its buyer or the event's managers only, never cached.                                                                                                                                                                                                                                                                                        |
| `GET /api/og/event`                     | Share image (SHR-02) as JPEG: `slug`, `format` (`og` 1200×630, `post` 1080², `story` 1080×1920, `invitation` 1080×1350), `locale`, `download=1`. Public and unlisted events only (ADR 0013).                                                                                                                                                                       |
| `GET /api/organizer/events/{id}/export` | PRT-05 attendee list as Excel (`locale`), managers only; right-to-left sheet in Arabic.                                                                                                                                                                                                                                                                            |
| `/sitemap.xml`, `/robots.txt`           | Public pages and public upcoming events only; personal and management pages are disallowed.                                                                                                                                                                                                                                                                        |
