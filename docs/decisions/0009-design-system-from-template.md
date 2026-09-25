# 0009. Design system from the founder's UI template

- Status: Accepted
- Date: 2026-09-24

## Context

On 2026-09-24 the founder provided a UI template (home, explore, event page, mobile screens, colour palette, typography, UI elements) and asked for the UI to follow it. Spec section 8 had a slightly different palette (green `#2F5D3A`, terracotta, cream `#F7F1E5`).

## Decision

- **Palette from the template:** Forest Green `#2D5A27` (primary), Terracotta `#C2622D`, Cream `#F5F0E8` (background), Brown `#8B5E3C` (secondary text), Sand `#E8DCC8` (UI surfaces). A darker terracotta `#A64E1F` is used for text and buttons, because `#C2622D` fails WCAG AA on cream.
- **Typography from the template:** Playfair Display (headlines) and Inter (body). Arabic pairing chosen to match: Amiri (headlines) and IBM Plex Sans Arabic (body).
- **Stack:** Tailwind CSS 4 with tokens generated from `packages/ui-tokens` (`tokens.css`), shadcn/ui (Radix) components converted to logical classes for RTL, lucide icons, next-themes for light/dark.
- **Screens from the template** built in Phase 1: header, hero with search and city picker, category tiles, trending cards, explore with sidebar and chips, event page with facts row, tabs, people going and booking bar, green footer band with the tagline.
- Demo photos come from Unsplash (credited in `apps/web/public/images/CREDITS.md`) until organizers upload their own.

## Consequences

- The spec palette values are superseded by the template's.
- The founder's logo files arrived on 2026-09-25 and are used as provided (OPEN_QUESTIONS Q5).
- Contrast is enforced by tests, so palette changes cannot silently break accessibility.
