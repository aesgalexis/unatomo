# Whats New Policy

This file guides Codex updates to the public `Novedades` / `What's new` section.

Authoritative toggle: `docs/codex-flags.json`.

- If `whatsNewUpdates` is `false`, do not add entries to `static/js/sections/whatsNewData.js`.
- If `whatsNewUpdates` is `true`, consider adding one short bilingual entry only when a change is visible and relevant to end users.
- Do not add entries for internal refactors, lint/build fixes, small cosmetic corrections, or temporary debugging.
- Meaningful security improvements may be announced when they protect users, data, access, or product integrity. Describe the user benefit in plain language without exposing sensitive implementation details, weaknesses, or attack paths, and avoid absolute claims such as "fully secure."
- Keep entries brief, product-facing, and factual.
- Prefer entries that show useful product evolution over a technical development log. Over time, the section should make it clear that the product is active, maintained, and continuously improving.
- Use ISO dates (`YYYY-MM-DD`).
- Newest entries go first.

The section is intentionally static. It does not use Firebase.

The control panel card can show or locally pause the preference in the browser, but Codex must treat `docs/codex-flags.json` as the source of truth during code work.
