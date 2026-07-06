# Unatomo

Unatomo is a machine-centered operational web app. It gives each physical
machine a digital context through QR/NFC access, history, tasks, documents,
status, users, and admin workflows.

The product is currently a static bilingual web application backed by Firebase.
It is active work in progress and is already shaped around real machine
operations rather than a generic SaaS template.

## What It Does

- Creates a digital record for each physical machine.
- Lets people open machine pages through QR/NFC links.
- Keeps machine history, tasks, documents, status, and ownership context in one
  place.
- Supports Spanish and English public/dashboard routes.
- Uses Firebase Auth, Firestore, Storage, and Functions for the live backend.
- Includes owner-only control panel tools for system status, backups, users,
  registration codes, and Tag IDs.

## Main Product Areas

- Public website and landing pages under `/`, `landing/`, `es/`, and `en/`.
- NFC/dashboard app under `nfc/es/` and `nfc/en/`.
- Shared frontend source under `static/js/` and `static/css/`.
- Firebase rules and callable Functions under `firebase/`.
- Local build, validation, backup, and publish helpers under `scripts/`.

For a fuller product explanation, read
[docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md).

## Requirements

- Node.js 22.12.0 is the recommended version.
- npm 11.0.0 is the version used by the project metadata.
- Firebase project credentials are needed for the live backend flows.

On Windows PowerShell, use `npm.cmd` if plain `npm` is blocked by execution
policy.

## Local Setup

```powershell
npm.cmd install
copy .env.example .env.local
copy .firebaserc.example .firebaserc
npm.cmd run dev
```

Fill `.env.local` with the Firebase web config values for the target project.
The frontend reads a generated local file at
`static/js/config/runtime-config.js`; that file is ignored and should not be
committed with real project values.
Fill `.firebaserc` with the Firebase project alias for local owner-run Firebase
commands; that file is also ignored.

## Useful Commands

```powershell
node scripts\syntax-scan.mjs static\js
npm.cmd run build
npm.cmd run lint:links
npm.cmd run scan:secrets
npm.cmd run check:nfc:architecture
```

Before Firebase data-flow or production-sensitive work, read the relevant docs
listed in [docs/REPO_MAP.md](docs/REPO_MAP.md).

## Deployment Policy

Publishing and Firebase deployments are owner-run by default. Agents and
contributors should implement changes and run local validation, but should not
publish or deploy without explicit owner instruction in the current task.

See [docs/DEPLOY_NOTES.md](docs/DEPLOY_NOTES.md) for the exact commands and
rules.

## Security

This is a public repository. Read [SECURITY.md](SECURITY.md) before touching
Firebase config, backups, QR access, App Check, or production-sensitive notes.

## Repository Notes

- Do not commit `.env.local`, backup snapshots, service-account files, tokens,
  or private production data.
- `codex-memory/` is intentionally ignored and should stay local/private.
- User-facing UI should preserve the existing Spanish and English support.
- Purple/violet `#7c3aed` is reserved for superadmin-only UI signals.

## License

This repository is currently not published as an open-source package. Reuse,
redistribution, and production use require permission from the owner.
