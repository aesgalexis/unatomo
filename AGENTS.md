# Agent Operating Notes

This repository is the active `unatomo` project. User-facing UI must stay bilingual where the app already supports Spanish and English.

## Fast Orientation

- Start with `README.md` and `docs/REPO_MAP.md` for the current project map.
- Use `docs/PROJECT_OVERVIEW.md` for the product summary.
- Use `docs/DASHBOARD_MODEL.md` for dashboard, machine cards, Tag ID, QR print, menu, and i18n work.
- Use `docs/FIREBASE_MODEL.md` before changing Firebase data flows, callable functions, ownership, admin links, Tag ID, or QR cleanup.
- Use `docs/DEPLOY_NOTES.md` before publishing or diagnosing push/build problems.
- Use `docs/WHATS_NEW_POLICY.md` before adding public `Novedades` / `What's new` entries; respect `docs/codex-flags.json`.
- Older notes also exist in `docs/ARCHITECTURE.md` and `docs/DEV.md`; prefer the files above when they disagree with older NFC mock-route details.

## Common Commands

Use `npm.cmd` in PowerShell if `npm` is blocked by execution policy.

```powershell
node scripts\syntax-scan.mjs static\js
npm.cmd run build
npm.cmd run check:nfc:architecture
npm.cmd run site:publish
npm.cmd run scan:secrets
npm.cmd run deploy:nfc:backend
```

## Project Rules

- Keep progress updates sparse. Prefer silent work unless there is a relevant finding, a file edit is about to happen, the task becomes long-running, or the work is blocked.
- Publishing and deployments are owner-run by default. Agents
  must not execute `npm.cmd run site:publish`, any `deploy:nfc:*` command, or a
  targeted Firebase deploy unless the owner explicitly asks for execution in
  that turn. Local validation commands such as build, lint, syntax scans, and
  architecture checks remain agent-run. At handoff, provide the exact required
  publish/deploy commands in copy-paste order, or state clearly that no publish
  or deploy is required.
- Use the repository `deploy:nfc:*` scripts for Firebase deployments. They remove inherited `DEBUG` and `FIREBASE_DEBUG` values that otherwise produce very large Firebase CLI traces. For a targeted deploy, use `npm.cmd run firebase:clean -- deploy --only "functions:name"`.
- Keep command output bounded: search the smallest relevant paths, request narrow line ranges, and avoid dumping full large files when a targeted `rg` plus a short range is enough.
- Do not inspect generated `dist/` or `firebase/functions/lib/` unless diagnosing the build output itself. Work from source files.
- Do not repeatedly read the same context document in one task. Start from the routed docs above, then open only the relevant feature files.
- Do not leave temporary Firebase/admin scripts in the repo after one-off operations.
- Do not change Firebase ownership/admin/tag cleanup flows without reading `docs/FIREBASE_MODEL.md`.
- Preserve Spanish and English routes, labels, and menu entries when touching user-facing pages.
- Use `superadmin` for UI/features visible only to the project owner account. In code this maps to the existing `control panel user` check in `nfc/controlpanel/access.js`.
- Purple/violet (`#7c3aed`) is reserved for superadmin-only UI signals. Do not use it for ordinary machine states, tags, NFC, admin-machine relationships, or general accents.
- Do not revert user changes unless explicitly asked.
- Keep edits scoped; this project has live production data behind the dashboard.
