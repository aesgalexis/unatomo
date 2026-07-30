# Agent Operating Notes

This is the active `unatomo` repository. Preserve Spanish and English wherever
the user-facing app already supports both.

## Orientation

- For a localized task, start with targeted `rg` searches. For broad or
  unfamiliar code work, start with `docs/REPO_MAP.md`; read `README.md` only
  when setup or the public repository entry point matters.
- Subagents are optional and off by default. Read `docs/SUBAGENTS.md` only when
  the user requests delegation or an independent high-risk review clearly
  justifies the extra context.
- For documents over 5 KB, inspect headings first and read narrow relevant
  ranges. Load the complete document only for genuinely cross-cutting work.

## Documentation Routing

- `docs/PROJECT_OVERVIEW.md`: product context.
- `docs/DASHBOARD_MODEL.md`: dashboard, machine cards, groups, Tag ID, QR
  print, menu, and i18n.
- `docs/FIREBASE_MODEL.md`: required before changing Firebase data flows,
  callable Functions, ownership, admin links, Tag ID, or QR cleanup. Read the
  affected sections plus `Production Safety`; read all of it when permissions
  or data relationships cross several areas.
- `docs/DEPLOY_NOTES.md`: required before publishing, deploying, or diagnosing
  build/push problems.
- `docs/WHATS_NEW_POLICY.md`: required before public `Novedades` / `What's new`
  entries; respect `docs/codex-flags.json`.
- `docs/DEV.md`: setup and local commands. Older architecture notes are
  secondary when they conflict with the routed documents above.

## Working Rules

- Keep progress and handoffs concise: outcome, relevant findings, validation,
  and any required deployment commands.
- Publishing and Firebase deployments are owner-run. Do not publish or deploy
  unless the owner explicitly requests it in the current turn. Local checks are
  agent-run. At handoff, give the exact required commands in order or state
  that no publish/deploy is needed.
- Keep output bounded: search small scopes, read narrow ranges, and use scoped
  `git diff --stat`, `git diff --check`, and diffs. Do not inspect generated
  `dist/` or `firebase/functions/lib/` unless diagnosing generated output.
- Validate proportionally and in batches. For small copy/CSS changes, use
  targeted checks and one final visual review. Run a full build once per
  coherent change set or when bundling/site-wide output may be affected.
- Before changing Firebase ownership, admin, Tag ID, or cleanup flows, follow
  `docs/FIREBASE_MODEL.md`. Never leave one-off Firebase/admin scripts behind.
- Never commit secrets, backups, service accounts, local memory, or private
  production data.
- Use `superadmin` for owner-only UI; it maps to the existing control-panel user
  check. Violet `#7c3aed` is reserved for superadmin-only signals.
- Preserve unrelated user changes, keep edits scoped, and remember that the
  dashboard is backed by live production data.
