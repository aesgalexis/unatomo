# Agent Operating Notes

This repository is the active `unatomo` project. User-facing UI must stay bilingual where the app already supports Spanish and English.

## Fast Orientation

- For a broad or unfamiliar code task, start with `docs/REPO_MAP.md`. Read
  `README.md` only when repository setup or the public project entry point is
  relevant. For a localized task with an explicit path or feature, begin with
  a targeted `rg` search and do not load overview files.
- Subagents are optional and off by default. Do not perform a delegation
  assessment for every task, and do not read `docs/SUBAGENTS.md` unless the
  user explicitly requests delegation or a clearly independent, high-risk
  review justifies its extra context and token cost.
- Use `docs/PROJECT_OVERVIEW.md` only when product context is needed.
- Use `docs/DASHBOARD_MODEL.md` for dashboard, machine cards, Tag ID, QR print,
  menu, and i18n work. Inspect its headings first and read only the sections
  relevant to the change unless the work is cross-cutting.
- Use `docs/FIREBASE_MODEL.md` before changing Firebase data flows, callable
  functions, ownership, admin links, Tag ID, or QR cleanup. Read the sections
  for the affected flow plus `Production Safety`; read the whole document only
  when permissions or data relationships span multiple areas.
- Use `docs/DEPLOY_NOTES.md` before publishing or diagnosing push/build problems.
- Use `docs/WHATS_NEW_POLICY.md` before adding public `Novedades` / `What's new` entries; respect `docs/codex-flags.json`.
- Older notes also exist in `docs/ARCHITECTURE.md`; prefer the routed files
  above when they disagree with older NFC mock-route details.

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
- For documentation over 5 KB, inspect headings with
  `rg -n "^#{1,3} " <file>` and read narrow line ranges by default. Load the
  complete document only when its sections are tightly coupled to the task.
- Validate proportionally and in batches. For small copy or CSS edits, use
  targeted checks and one final visual review; do not run a full build or take
  repeated full-page screenshots after every micro-change. Run the full build
  once at the end of a coherent change set, or earlier only when the change can
  affect bundling or site-wide output.
- Prefer `git diff --stat`, `git diff --check`, and scoped diffs over dumping
  the complete working-tree diff.
- Do not leave temporary Firebase/admin scripts in the repo after one-off operations.
- Do not change Firebase ownership/admin/tag cleanup flows without reading `docs/FIREBASE_MODEL.md`.
- Preserve Spanish and English routes, labels, and menu entries when touching user-facing pages.
- Use `superadmin` for UI/features visible only to the project owner account. In code this maps to the existing `control panel user` check in `nfc/controlpanel/access.js`.
- Purple/violet (`#7c3aed`) is reserved for superadmin-only UI signals. Do not use it for ordinary machine states, tags, NFC, admin-machine relationships, or general accents.
- Do not revert user changes unless explicitly asked.
- Keep edits scoped; this project has live production data behind the dashboard.
