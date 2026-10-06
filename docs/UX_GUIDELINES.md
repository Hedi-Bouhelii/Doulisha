# UX guidelines

The Doulisha interface follows the **UI template approved by the founder on 2026-09-24** (ADR 0009), refined into **design system v2 on 2026-09-30** (ADR 0025): warm, local, photo-led, with a forest-green and terracotta palette on cream, soft cards and one status palette everywhere. Tokens live in `packages/ui-tokens` (framework-free, reusable by the mobile app); the web app imports the generated `tokens.css`.

To see every component and state: run `pnpm dev` and open `/fr/design`, `/ar/design` (development only).

## Colour

| Token                 | Light                            | Use                                                             |
| --------------------- | -------------------------------- | --------------------------------------------------------------- |
| `primary`             | Forest green `#2D5A27`           | Primary buttons, active chips and navigation, links, focus ring |
| `highlight`           | Terracotta `#A64E1F` (text-safe) | Urgency badges ("3 places left"), eyebrows, the accent button   |
| `background`          | Cream `#F5F0E8`                  | Page background                                                 |
| `card`, `popover`     | Warm white `#FFFCF7`             | Cards, forms, menus, dialogs                                    |
| `secondary` / borders | Sand `#E8DCC8`                   | Chips, borders, subtle surfaces                                 |
| `muted-foreground`    | Brown `#8B5E3C`                  | Secondary text (4.9:1 on cream)                                 |
| `foreground`          | Ink `#2A2420`                    | Body text                                                       |

- The template's terracotta `#C2622D` is only 3.6:1 on cream: use it for decoration (logo sun, illustrations), never for text. Text and buttons use `highlight` (`#A64E1F`, 5.5:1).
- A dark theme exists for every token (`.dark`); the header has a toggle and the first render follows the system.
- `packages/ui-tokens/src/tokens.test.ts` checks WCAG AA for every text/background pair in both themes, including each status colour on its tint. Change a colour, run the tests.
- **Category accents** (`bg-cat-<name>-bg`, `text-cat-<name>-fg`, `text-cat-<name>`): outdoor green, sports blue, entertainment red, learning terracotta, celebrations rose, couples pink, corporate slate, kids teal. They are for categories only, never for statuses.

### Status palette

Every status is a soft tint with its text colour (`bg-<tone>-soft text-<tone>`), drawn by `Badge` and chosen in one place: `statusTone` in `components/doulisha/status-badge.tsx`. The same status always has the same colour.

| Tone      | Tint / text                   | Statuses                                           |
| --------- | ----------------------------- | -------------------------------------------------- |
| `success` | `#E0F0E5` / `#276F45`         | published, confirmed, paid, approved               |
| `warning` | `#FBEBC8` / `#8A5A00`         | payment pending, reserved, to pay, partially paid  |
| `info`    | `#E1EBF5` / `#2B5C8A`         | full, waitlisted, place offered, deposit, unlisted |
| `danger`  | `#FBE3E0` / `destructive`     | cancelled, rejected, errors                        |
| `primary` | `#E4EDDC` / `primary`         | ongoing, public, selected options                  |
| `accent`  | terracotta tint / `highlight` | private                                            |
| `neutral` | `muted` / `muted-foreground`  | draft, closed, completed, expired, refunded        |

Messages that ask for attention use the same tints: errors `bg-destructive-soft text-destructive` with an alert icon, deadlines `warning`, information `info`, success `success`.

## Shape and elevation

| Radius         | Size  | Use                                               |
| -------------- | ----- | ------------------------------------------------- |
| `rounded-xl`   | 14 px | Inputs, selects, small tiles                      |
| `rounded-2xl`  | 20 px | Cards, list items, notices                        |
| `rounded-3xl`  | 28 px | Hero images, dialogs, the booking card, big cards |
| `rounded-full` | pill  | Buttons, badges, chips, tabs                      |

Shadows are warm-tinted and soft: `shadow-xs` (inputs, small cards inside cards), `shadow-card` (resting cards), `shadow-raised` (hover, sticky panels), `shadow-overlay` (menus, dialogs, sheets, the mobile booking bar). Cards are `rounded-2xl border border-border/70 bg-card shadow-card`; interactive cards lift on hover (`hover:-translate-y-0.5 hover:shadow-raised`).

## Typography

| Role                       | Latin                    | Arabic               |
| -------------------------- | ------------------------ | -------------------- |
| Headlines (`font-display`) | Playfair Display 600/700 | Amiri 400/700        |
| Body (`font-sans`)         | Inter                    | IBM Plex Sans Arabic |

Both stacks list the Latin font first and the Arabic font second, so mixed text picks the right font per glyph. Only Inter is preloaded; the others swap in, to keep the first load light on 4G. Arabic body text uses a line height of 1.7.

- Page titles: `PageHeader` (h1 `font-display`, 3xl → 4xl, tracking-tight). Section titles: `SectionHeading` (h2 `font-sans` xl, optional icon). Eyebrows: small uppercase `highlight` text above a title.

## Layout and RTL

- **Widths:** `Container` gives the page width and gutters (16 px on phones, 24 px from `sm`): `narrow` (forms, 672 px), `default` (1024 px), `wide` (1280 px). Lists and tickets use 768 px; event and checkout pages 1152 px.
- Every page works from 320 px to 1440 px and wider, with no horizontal scroll. Rails and tab lists scroll inside themselves (`overflow-x-auto no-scrollbar`).
- `<html lang dir>` follows the route locale (`/ar` is right-to-left).
- Use logical utilities only: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`, `border-s`, `rounded-s`. Never `ml-`, `pr-`, `left-`, `text-left`. The shadcn/ui components were converted when added; convert new ones the same way.
- Mirror directional icons with `rtl:rotate-180` (arrows, chevrons, back buttons, send).
- Numbers, prices and phone numbers keep left-to-right order: `ltr-nums` class, or wrap interpolated values in `⁦…⁩` inside messages. Prices use Latin digits in Arabic, as in Tunisia (`45 د.ت`).
- Sheets slide from the reading-start side (`side={rtl ? 'right' : 'left'}`). Dialogs are bottom sheets on phones and centred cards from `sm`.

## Touch, focus and screen readers

- Interactive elements are at least 44 px: buttons are `h-11` by default (`lg` is 48 px), inputs `h-11`, icon buttons `size-11`.
- Focus is always visible: a 4 px ring in `ring` at 25% (`focus-visible:ring-4 focus-visible:ring-ring/25`); fields also turn their border `primary`.
- Icon-only buttons have an `aria-label`; decorative icons and illustrations have `aria-hidden`.
- Every page has a "skip to content" link and one `h1`. Steppers mark the current step with `aria-current="step"`; navigation marks the current page with `aria-current="page"`.

## Buttons

`Button` variants: `default` (green, the one main action), `accent` (terracotta, rare), `outline` (secondary actions), `soft` (green tint: add a ticket, connect an account), `secondary`, `ghost` (tertiary, menus), `destructive` (confirming a cancellation), `link`. All are pills. One main action per screen or card; destructive actions always ask first in a dialog.

## Required states

Every data view has:

- **Loading:** a skeleton with the final shape. List routes that never answer 404 or redirect (explore, feed, messages, the host's list of private invitations at `/host`) have a `loading.tsx` drawing `PageSkeleton` (`grid`, `list`). Routes that can answer 404 or redirect (event, ticket, member, organizer and invitation pages, the organizer space, the account) have none: a streamed response is always sent as 200, so a private or unknown event would no longer return 404. Sections inside a page use `Suspense` with their own skeletons (`EventCardSkeleton`, chat, wall).
- **Empty:** `EmptyState` with an icon in a soft circle (or the sun-over-hills illustration), a title, a hint and one next action. `size="compact"` inside cards and tabs.
- **Error:** `EmptyState tone="alert"` with a retry (`[locale]/error.tsx` for whole pages, which also offers the way home).
- **Not found:** the localized 404 (`[locale]/not-found.tsx`, home and Explore); unknown paths inside a locale land there.

## Forms and flows

- **Steps, not long pages:** checkout has three steps (tickets, details, payment) shown as numbered circles, with the order summary always visible; the event wizard has seven, in a side stepper with an icon per step, "Step 2 of 7" and a segmented progress bar (founder's mockup, 2026-09-28). Each step opens with its icon, title and a one-line hint.
- **Nothing is lost:** the wizard auto-saves a second after typing stops and shows "Saving… / Draft saved / Could not save".
- **Choices as cards:** radio options with more than a word (registration type, visibility, cancellation policy, privacy, report reasons, payment methods) are selectable cards: the whole card is the label, the selected one turns `primary-soft` with a `primary` border.
- **Local methods first:** online payment, D17, bank transfer and cash are listed with a one-line explanation each.
- **Dates:** `datetime-local` inputs, always read as Tunisia time.
- **Guests:** booking and RSVP never require an account; a guest session is created on submit.
- **Door check-in:** a present count with a progress bar, then big coloured results (success, warning for already checked in or cash to collect, danger for invalid) that read at arm's length. Cash to collect shows the amount and one button "Collected, check in".
- **Print:** the header, footer and organizer navigation are `print:hidden`; the attendee list prints as a plain table.
- **Accounts (ADR 0016):** sign-up asks one question first (join or organize), then one field (phone or email), then a code, then name and password on a separate screen. Sign-in shows the password first and "Receive a code instead" as a link. On large screens the auth card has a green brand panel beside the form; phones get the form alone.
- **Never a silent disabled button:** "Continue" stays clickable and lists what is missing (red fields, short sentences) instead of greying out.
- **Phones:** the main action sits in a bar fixed to the bottom, with the total; the order summary folds into a card at the top.
- **After booking:** one "what to do now" card for the method the buyer chose, with a status icon, the D17 number or RIB with a copy button, then the receipt upload, as numbered steps. Other methods only behind "Pay differently".
- **Tickets** look like tickets: a green stub with the person's name, a perforation with notches, a large QR code. "My tickets" rows are ticket stubs too (date on the stub, a dashed perforation).
- **No QR code before the money (ADR 0018):** a D17 or transfer booking shows "Place reserved", the deadline, and a placeholder where the QR code will appear. A refused receipt shows the organizer's reason above the upload.
- **Payments inbox:** one card per payment with everything needed to decide (buyer with initials, phone, event, reference, expected amount, deadline as a warning pill) and the receipt inline; the main action states the amount ("Confirm: 30 DT received"). Refusing always asks for a reason the buyer will read.
- **Event management (founder's mockup, 2026-09-28):** cover, title and status, then three small figures (places, booked, present) and the fill bar; the main actions (view, edit, check-in) and a "⋯" menu for exports, duplicate and cancel. Attendees are cards with initials, contact, reference, source and the order's payment action. Booking sources and sharing sit in side cards.
- **Social sign-in (ADR 0019):** Google and Facebook buttons sit below the code form, with their brand marks, under "or continue with". Failures come back as a sentence that says what to do next, never an error code.
- **Sharing images:** on phones the main action is "Share" (the share sheet); where files cannot be shared, "Download" also copies the link, and the dialog says so.
- **Wall and chat menus:** actions on someone else's content (report, block) and on your own (delete) sit in one "⋯" menu per item; blocking always asks for confirmation and says the person is not told.
- **Defaults over forms:** the wizard's ticket step asks only for a price; rarely used options sit in a folded "More options".
- **Mixed-language text** (a French title on an Arabic page) uses `dir="auto"` so it truncates and aligns on its own reading side.

## Motion

150–250 ms with `ease-standard`; card hover lifts, image zoom and button press (`active:scale-[0.98]`) only. `prefers-reduced-motion` disables animations and transitions globally.

## Components

| Component                                    | Where                      | Notes                                                                                                                                                                              |
| -------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Container`, `PageHeader`, `BackLink`        | every page                 | `components/doulisha/page.tsx`: width scale, title block with eyebrow, description, meta and actions, "back to …" link                                                             |
| `SectionHeading`, `StatCard`                 | pages, organizer space     | Section title with icon and action; a key figure with a tinted icon                                                                                                                |
| `Card`                                       | anywhere                   | `components/ui/card.tsx`; `interactive` lifts on hover                                                                                                                             |
| `Badge`                                      | statuses, labels           | Soft tones `neutral`, `primary`, `success`, `warning`, `danger`, `info`, `accent`, with an optional `dot`                                                                          |
| `StatusBadge`, `statusTone`, `toneOf`        | organizer space, tickets   | One status → tone map for events, bookings and payments                                                                                                                            |
| `EventCard`, `EventCardSkeleton`             | home, explore, feed        | Whole card is one link; category pill, urgency badge when ≤ 5 places or full, date in `primary`, price and "going" in the footer                                                   |
| `CategoryChip`                               | explore                    | Links (filters work without JavaScript)                                                                                                                                            |
| `CategoryTile`                               | home                       | Overlaps the hero, category accent colours                                                                                                                                         |
| `FiltersPanel`                               | explore                    | One filter form: a toggle with the active count on phones, a sticky side panel on large screens                                                                                    |
| `PriceTag`                                   | cards, event page          | "From 45 DT" / "Free", integer millimes in                                                                                                                                         |
| `PlacesLeft`                                 | cards, event page          | Terracotta under 20% of capacity                                                                                                                                                   |
| `FriendsGoing`                               | event page                 | Only attendees who made their attendance public (ACC-06)                                                                                                                           |
| `OrganizerCard`                              | event page                 | Verified badge                                                                                                                                                                     |
| `StickyCTA`                                  | event page                 | Fixed bottom bar on phones; on large screens a ticket-like card with `details`, a perforation and the action. One element, so the booking button exists once                       |
| `TicketQR`                                   | ticket page                | Server-rendered SVG on white, works offline once loaded; the code is printed under it for manual check-in                                                                          |
| `AttendeeRow`                                | component gallery          | The organizer list (`ManagePanel`) uses the same payment tones, plus order actions (mark paid, notes)                                                                              |
| `EmptyState`                                 | everywhere                 | Empty and error states; `icon`, `secondaryAction`, `size="compact"`                                                                                                                |
| `PageSkeleton`                               | list routes' `loading.tsx` | Skeletons shaped like the page: `grid`, `list`; never on routes that can answer 404 or redirect                                                                                    |
| `LeafSprig`, `HillsBackdrop`                 | auth, wizard, tickets      | Inline brand decorations from the mockups, `aria-hidden`, used sparingly at the edges                                                                                              |
| `Logo`, `LogoMark`                           | header, footer, sign-in    | Brand files in `public/images/brand` (trimmed from `public/images/logo.png` and `symbol.png`). On dark backgrounds the symbol sits on a cream badge and the wordmark is cream text |
| `Field`, `NativeSelect`, `fieldControlClass` | every form                 | Label above the field, required mark, optional hint or error; native `<select>` (phone pickers, RTL arrow); one look for inputs, textareas and selects                             |
| `ShareBar`                                   | event page, manage page    | WhatsApp, Facebook, Messenger (phones), copy, share sheet, share images; every link carries `utm_source`                                                                           |
| `NearMeRail`, `NearMeField`                  | home, explore              | Ask for the position only after a tap; clear message when refused                                                                                                                  |
| `LegalPage`                                  | terms, privacy, deletion   | Numbered sections and a sticky "On this page" list on large screens; placeholder until the lawyer's texts (OPEN_QUESTIONS Q17)                                                     |

## Performance budget

Event list interactive in under 2 s on 4G; images as WebP/AVIF through `next/image`, lazy except the first cards (`priority`). Checked properly in Phase 6.
