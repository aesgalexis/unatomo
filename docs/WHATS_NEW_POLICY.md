# Whats New Policy

This file guides Codex updates to the public `Novedades` / `What's new` section.

Authoritative toggle: `docs/codex-flags.json`.

- If `whatsNewUpdates` is `false`, do not add entries to `static/js/sections/whatsNewData.js`.
- If `whatsNewUpdates` is `true`, consider adding one short bilingual entry only when a change is visible and relevant to end users.
- Do not add entries for internal refactors, lint/build fixes, small cosmetic corrections, or temporary debugging.
- Keep entries brief, product-facing, and factual.
- Use ISO dates (`YYYY-MM-DD`).
- Newest entries go first.

The section is intentionally static. It does not use Firebase.

The control panel card can show or locally pause the preference in the browser, but Codex must treat `docs/codex-flags.json` as the source of truth during code work.
