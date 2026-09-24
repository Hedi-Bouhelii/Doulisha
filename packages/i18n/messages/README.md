# Interface messages

`ar.json`, `fr.json` and `en.json` hold every interface string, grouped by screen.
They are plain JSON (ICU message format) so the web app (next-intl) and the future
mobile app (i18next) can both read them.

- **English is the reference.** Every key in `en.json` must exist in the other two
  files; `messages.test.ts` enforces it.
- **Arabic needs review by a native speaker.** TODO(i18n-review): all of `ar.json`
  was written without native review. Prefer clear Modern Standard Arabic that reads
  naturally in Tunisia; avoid heavy dialect in interface text.
