# 0025. Design system v2: one surface, shape, elevation and status system for every screen

- Status: Accepted
- Date: 2026-09-30

## Context

The interface was built phase by phase on the founder's template (ADR 0009). Each phase added screens with its own card corners, shadows, status colours (category accents reused as "paid", "pending"…), error boxes and page headers, so the app no longer looked like one product. On 2026-09-30 the founder asked for a complete redesign into one premium design system, on the same palette (cream `#F5F0E8`, forest `#2D5A27`, terracotta `#C2622D`, brown `#8B5E3C`), with two mockups made on 2026-09-28: the organizer's event management page and the create-event wizard with a side stepper. Business logic, data and APIs stay as they are.

## Decision

- **Tokens** (`packages/ui-tokens`, still framework-free for the mobile app):
  - a warm white surface `#FFFCF7` for cards, menus and dialogs, so cards stand out from the cream page;
  - soft tints with a text colour for each status tone: `primarySoft`, `successSoft`, `warningSoft`, `destructiveSoft`, `info` and `infoSoft` (success darkened to `#276F45` to pass AA on its tint);
  - an ordered radius scale (`xl` 14 px inputs, `2xl` 20 px cards, `3xl` 28 px hero, dialogs and the booking card, pills for buttons and badges);
  - four warm-tinted elevations, `xs`, `card`, `raised` and `overlay`, in both themes, exposed as `shadow-*` utilities.
  - The contrast tests cover every new text/tint pair.
- **One status palette:** `Badge` soft tones (`neutral`, `primary`, `success`, `warning`, `danger`, `info`, `accent`) and a single `statusTone` map for events, bookings and payments. Category accents are kept for categories only.
- **Primitives restyled once, used everywhere:** pill buttons with `accent` and `soft` variants and 44 px default height; one field style (`fieldControlClass`) for inputs, textareas and selects; `Card`; underline and pill tabs; dialogs that are bottom sheets on phones; larger checkbox, radio and switch (the radio dot is now centred in RTL too).
- **Page building blocks:** `Container`, `PageHeader`, `BackLink`, `SectionHeading`, `StatCard`, `FiltersPanel`, `PageSkeleton` and two inline decorations (`LeafSprig`, `HillsBackdrop`). List routes that never answer 404 or redirect (explore, feed, messages, the host's list of private invitations) get a `loading.tsx` shaped like the page; the others keep rendering on the server first, because a streamed response is always 200 and private or unknown events must still answer 404. Error and 404 pages offer a way home.
- **Screens:** shell (header with active navigation, mobile menu, footer), home, explore, event page (facts, booking ticket card), checkout (numbered stepper), tickets (ticket stubs), auth (brand panel beside the form on large screens), account, feed, invitations, messages, member and organizer pages, legal pages, and the organizer space. The event management page and the wizard follow the founder's mockups.
- **The founder's uncommitted draft** of the private invitation form (2026-09-30) is folded in: its layout is kept, its English-only texts and emoji became `Host.*` messages in French, English and Arabic, and its misnamed keys were removed (`KindText`, `messagePlaceHolder`, `whenPlaceholder`).
- **No new user-facing text outside the message files:** new labels (stat names, step hints, "Step 2 of 7", "More actions", the organizer thank-you card) exist in fr, en and ar. The dev-only `/design` gallery keeps English developer labels.

## Consequences

- New screens start from the building blocks above; a status gets its colour from `statusTone`, never from a category accent.
- `docs/UX_GUIDELINES.md` describes the system; `/design` shows it in every language and theme.
- Test ids used by the E2E suite are unchanged; the booking button still exists once on the event page.
- Amends ADR 0009 (palette and typography unchanged; shapes, surfaces, elevations and status colours added).
