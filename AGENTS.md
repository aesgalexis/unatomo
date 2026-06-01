# Codex Operating Notes

This repository is the active `unatomo` project. The usual working language with the owner is Spanish, but user-facing UI must stay bilingual where the app already supports Spanish and English.

## Fast Orientation

- Start with `docs/CODEX_CONTEXT.md` for the current project map.
- Use `docs/DASHBOARD_MODEL.md` for dashboard, machine cards, Tag ID, QR print, menu, and i18n work.
- Use `docs/FIREBASE_MODEL.md` before changing Firebase data flows, callable functions, ownership, admin links, Tag ID, or QR cleanup.
- Use `docs/DEPLOY_NOTES.md` before publishing or diagnosing push/build problems.
- Older notes also exist in `docs/ARCHITECTURE.md` and `docs/DEV.md`; prefer the files above when they disagree with older NFC mock-route details.

## Common Commands

Use `npm.cmd` in PowerShell if `npm` is blocked by execution policy.

```powershell
node scripts\syntax-scan.mjs static\js
npm.cmd run build
npm.cmd run site:publish
npm.cmd run scan:secrets
```

## Project Rules

- Do not leave temporary Firebase/admin scripts in the repo after one-off operations.
- Do not change Firebase ownership/admin/tag cleanup flows without reading `docs/FIREBASE_MODEL.md`.
- Preserve Spanish and English routes, labels, and menu entries when touching user-facing pages.
- Use `superadmin` for UI/features visible only to the project owner account. In code this maps to the existing `control panel user` check in `nfc/controlpanel/access.js`.
- Purple/violet (`#7c3aed`) is reserved for superadmin-only UI signals. Do not use it for ordinary machine states, tags, NFC, admin-machine relationships, or general accents.
- Do not revert user changes unless explicitly asked.
- Keep edits scoped; this project has live production data behind the dashboard.
