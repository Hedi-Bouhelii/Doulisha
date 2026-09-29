# 0014. Attendee exports: Excel with exceljs, PDF through the browser's print

- Status: Accepted
- Date: 2026-09-25

## Context

PRT-05 asks for attendee lists in Excel and PDF. The PDF must render Arabic names and right-to-left text correctly, and serverless functions have tight size and time limits.

## Decision

- **Excel:** `/api/organizer/events/{id}/export` builds an `.xlsx` with `exceljs`: one row per person, one column per booking question, amounts in dinars, check-in times in Tunisia time. The sheet is right-to-left in Arabic. Access goes through the same tRPC procedures as the screens, so the manager check is the service's.
- **PDF:** `/organizer/events/{id}/print` is a print-optimized page; the organizer uses "Print or save as PDF". The site header, footer and navigation are hidden in print (`print:hidden`).

## Consequences

- No headless browser or PDF library on the server: text is shaped by the browser, so Arabic is correct, and the functions stay small.
- The PDF layout depends a little on the browser; a server-generated PDF can be added later if organizers need a fixed layout.
