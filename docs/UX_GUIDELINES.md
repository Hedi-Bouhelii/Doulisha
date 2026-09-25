# UX guidelines

The Doulisha interface follows the **UI template approved by the founder on 2026-09-24** (ADR 0009): warm, local, photo-led, with a forest-green and terracotta palette on cream. Tokens live in `packages/ui-tokens` (framework-free, reusable by the future mobile app); the web app imports the generated `tokens.css`.

To see every component and state: run `pnpm dev` and open `/fr/design`, `/ar/design` (development only).

## Colour

| Token                 | Light                            | Use                                                                        |
| --------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `primary`             | Forest green `#2D5A27`           | Primary buttons, active chips and navigation, links, focus ring            |
| `highlight`           | Terracotta `#A64E1F` (text-safe) | Urgency badges ("3 places left"), the footer dot, secondary call to action |
| `background`          | Cream `#F5F0E8`                  | Page background                                                            |
| `card`                | White                            | Cards, forms                                                               |
| `secondary` / borders | Sand `#E8DCC8`                   | Chips, borders, subtle surfaces                                            |
| `muted-foreground`    | Brown `#8B5E3C`                  | Secondary text (4.9:1 on cream)                                            |
| `foreground`          | Ink `#2A2420`                    | Body text                                                                  |

- The template's terracotta `#C2622D` is only 3.6:1 on cream: use it for decoration (logo sun, illustrations), never for text. Text and buttons use `highlight` (`#A64E1F`, 5.5:1).
- A dark theme exists for every token (`.dark`); the header has a toggle and the first render follows the system.
- `packages/ui-tokens/src/tokens.test.ts` checks WCAG AA for every text/background pair in both themes. Change a colour, run the tests.
- **Category accents** (`bg-cat-<name>-bg`, `text-cat-<name>-fg`, `text-cat-<name>`): outdoor green, sports blue, entertainment red, learning terracotta, celebrations rose, couples pink, corporate slate, kids teal. They keep Doulisha from looking outdoor-only.

## Typography

| Role                       | Latin                    | Arabic               |
| -------------------------- | ------------------------ | -------------------- |
| Headlines (`font-display`) | Playfair Display 600/700 | Amiri 400/700        |
| Body (`font-sans`)         | Inter                    | IBM Plex Sans Arabic |

Both stacks list the Latin font first and the Arabic font second, so mixed text picks the right font per glyph. Only Inter is preloaded; the others swap in, to keep the first load light on 4G. Arabic body text uses a line height of 1.7.

## Layout and RTL

- `<html lang dir>` follows the route locale (`/ar` is right-to-left).
- Use logical utilities only: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`, `border-s`, `rounded-s`. Never `ml-`, `pr-`, `left-`, `text-left`. The shadcn/ui components were converted when added; convert new ones the same way.
- Mirror directional icons with `rtl:rotate-180` (arrows, chevrons, back buttons).
- Numbers, prices and phone numbers keep left-to-right order: `ltr-nums` class, or wrap interpolated values in `\u2066…\u2069` inside messages. Prices use Latin digits in Arabic, as in Tunisia (`45 د.ت`).
- Sheets slide from the reading-start side (`side={rtl ? 'right' : 'left'}`).

## Touch, focus and screen readers

- Interactive elements are at least 44 px (`min-h-11`, `size-11`).
- Focus is always visible (`:focus-visible` outline in `primary`).
- Icon-only buttons have an `aria-label`; decorative icons have `aria-hidden`.
- Every page has a "skip to content" link and one `h1`.

## Required states

Every data view has:

- **Loading:** a skeleton with the final shape (`EventCardSkeleton`, table skeletons), inside `Suspense`.
- **Empty:** `EmptyState` with the illustration, a title, a hint and one next action.
- **Error:** `EmptyState tone="alert"` with a retry (`[locale]/error.tsx` for whole pages).
- **Not found:** the localized 404 (`[locale]/not-found.tsx`); unknown paths inside a locale land there.

## Forms and flows (Phase 2)

- **Steps, not long pages:** checkout has three steps (tickets, details, payment) with the order summary always visible; the event wizard has seven. The current step is shown by name and number.
- **Nothing is lost:** the wizard auto-saves a second after typing stops and shows "Saving… / Draft saved / Could not save".
- **Local methods first:** online payment, D17, bank transfer and cash are listed with a one-line explanation each.
- **Dates:** `datetime-local` inputs, always read as Tunisia time.
- **Guests:** booking and RSVP never require an account; a guest session is created on submit.
- **Door check-in:** results are big and coloured (green OK, amber paid-later or already checked in, terracotta invalid) so they read at arm's length.
- **Print:** the header, footer and organizer navigation are `print:hidden`; the attendee list prints as a plain table.
- **Accounts (ADR 0016):** sign-up asks one question first (join or organize), then one field (phone or email), then a code, then name and password on a separate screen. Sign-in shows the password first and "Receive a code instead" as a link.
- **Never a silent disabled button:** "Continue" stays clickable and lists what is missing (red fields, short sentences) instead of greying out.
- **Phones:** the main action sits in a bar fixed to the bottom, with the total; the order summary folds into a card at the top.
- **After booking:** one "what to do now" card for the method the buyer chose (D17 number or RIB with a copy button, then the receipt upload). Other methods only behind "Pay differently".
- **Tickets** look like tickets: a coloured stub with the person's name, a perforation, a large QR code.
- **Mixed-language text** (a French title on an Arabic page) uses `dir="auto"` so it truncates and aligns on its own reading side.

## Motion

150–250 ms with `ease-standard`; card hover lifts and image zoom only. `prefers-reduced-motion` disables animations and transitions globally.

## Components

| Component                        | Where                   | Notes                                                                                                                                                                              |
| -------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventCard`, `EventCardSkeleton` | home, explore           | Whole card is one link; urgency badge when ≤ 5 places or full                                                                                                                      |
| `CategoryChip`                   | explore                 | Links (filters work without JavaScript)                                                                                                                                            |
| `CategoryTile`                   | home                    | Overlaps the hero, category accent colours                                                                                                                                         |
| `PriceTag`                       | cards, event page       | "From 45 DT" / "Free", integer millimes in                                                                                                                                         |
| `PlacesLeft`                     | cards, event page       | Terracotta under 20% of capacity                                                                                                                                                   |
| `FriendsGoing`                   | event page              | Only attendees who made their attendance public (ACC-06)                                                                                                                           |
| `OrganizerCard`                  | event page              | Verified badge                                                                                                                                                                     |
| `StickyCTA`                      | event page              | Fixed bottom bar on mobile, sidebar card on desktop                                                                                                                                |
| `TicketQR`                       | ticket page             | Server-rendered SVG, works offline once loaded; the code is printed under it for manual check-in                                                                                   |
| `AttendeeRow`                    | component gallery       | The organizer list (`ManagePanel`) uses the same payment colours, plus order actions (mark paid, notes)                                                                            |
| `EmptyState`                     | everywhere              | Empty and error states                                                                                                                                                             |
| `Logo`, `LogoMark`               | header, footer, sign-in | Brand files in `public/images/brand` (trimmed from `public/images/logo.png` and `symbol.png`). On dark backgrounds the symbol sits on a cream badge and the wordmark is cream text |
| `Field`, `NativeSelect`          | every form              | Label above the field, optional hint; native `<select>` (phone pickers, RTL arrow)                                                                                                 |
| `ShareBar`                       | event page, manage page | WhatsApp, Facebook, Messenger (phones), copy, share sheet, share images; every link carries `utm_source`                                                                           |
| `StatusBadge`                    | organizer space         | Event status pill: draft grey, published green, cancelled terracotta                                                                                                               |
| `NearMeRail`, `NearMeField`      | home, explore           | Ask for the position only after a tap; clear message when refused                                                                                                                  |
| `LegalPage`                      | terms, privacy          | Placeholder until the lawyer's texts (OPEN_QUESTIONS Q17)                                                                                                                          |

## Performance budget

Event list interactive in under 2 s on 4G; images as WebP/AVIF through `next/image`, lazy except the first cards (`priority`). Checked properly in Phase 6.
