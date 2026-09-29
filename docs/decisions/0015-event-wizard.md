# 0015. Event wizard: template-driven fields, auto-saved drafts, shared publish checks

- Status: Accepted
- Date: 2026-09-25

## Context

Organizers create events of many kinds (EVT-01..09). The spec wants a short guided flow that adapts to the category, and drafts that are never lost on a phone with a weak connection.

## Decision

- **Templates drive the form:** the draft is created from a template (`editor.create`), which sets the model, registration types, cancellation policy, brief and visibility. Template `fields` render as inputs in the "Details" step and are validated against the template on save (`validateDetails`). Template `modules` decide which logistics sections appear (pick-up points, programme).
- **Seven steps:** basics, date and place, details, tickets, logistics, brief, publish.
- **Saving:** event fields auto-save one second after the last change; lists (tickets, pick-up points, programme, questions) save when the organizer changes step. Changes that fail stay marked and are retried on the next save.
- **One set of checks:** `publishProblems` (pure, in `domain/publish.ts`) is used by `editor.get` to list what is missing and by `editor.publish` to refuse. Each problem links to the step that fixes it.
- **Times:** `datetime-local` inputs are read and written in Africa/Tunis (`toTunisInput`, `fromTunisInput`), whatever the device's time zone.
- **Private gatherings** do not use the wizard: `/host/new` creates them in one form (INV-01).

## Consequences

- Admins change a category's form by editing its template JSON (`/admin/templates`); no deployment is needed.
- The map pin and GPX track upload are not in the wizard yet (OPEN_QUESTIONS Q15, Q16): events created in the app have no coordinates until then, so they appear in "near me" only once a pin exists.
