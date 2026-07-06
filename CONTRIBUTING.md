# Contributing

This project contains live production-facing flows. Keep changes scoped,
validated, and easy to review.

## Before Changing Code

- Read [README.md](README.md) and [docs/REPO_MAP.md](docs/REPO_MAP.md).
- For dashboard/card/QR/i18n work, read
  [docs/DASHBOARD_MODEL.md](docs/DASHBOARD_MODEL.md).
- For Firebase, ownership, admin links, Tag ID, QR cleanup, callable Functions,
  or rules, read [docs/FIREBASE_MODEL.md](docs/FIREBASE_MODEL.md).
- For deployment or publish questions, read
  [docs/DEPLOY_NOTES.md](docs/DEPLOY_NOTES.md).

## Development Rules

- Preserve Spanish and English UI where the app already supports both.
- Keep edits scoped to the requested behavior.
- Do not commit secrets, `.env.local`, backup snapshots, service-account files,
  or private production data.
- Do not leave temporary Firebase/admin scripts in the repository.
- Do not publish or deploy unless the owner explicitly asks for it in the
  current task.
- Use `superadmin` only for project-owner-only UI/features.
- Keep purple/violet `#7c3aed` reserved for superadmin-only UI signals.

## Local Validation

Run the smallest relevant checks for the change. Common checks are:

```powershell
node scripts\syntax-scan.mjs static\js
npm.cmd run build
npm.cmd run lint:links
npm.cmd run scan:secrets
```

For dashboard architecture changes, also run:

```powershell
npm.cmd run check:nfc:architecture
```

## Deployments

Owner-run by default. At handoff, provide the exact publish/deploy commands
needed, or state that no publish or Firebase deployment is required.
