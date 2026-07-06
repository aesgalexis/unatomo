# Security Notes

This repository is public. Treat every committed file and every pushed commit as
public information.

## Do Not Commit

- `.env`, `.env.local`, `.firebaserc`, or real Firebase project config.
- `static/js/config/runtime-config.js`; it is generated locally from ignored env
  files.
- `.backups/`, Firebase Auth exports, Storage downloads, or backup manifests.
- Service account JSON files, access tokens, debug tokens, or private keys.
- Private Codex/operator notes, including `codex-memory/` and one-off prompt
  notes.
- Real production cleanup details such as backup filenames, Tag IDs, machine
  names, or account emails unless they are intentionally public contact data.

## Local Safety Checks

Run these before pushing security-sensitive changes:

```powershell
npm.cmd run scan:secrets
node scripts\syntax-scan.mjs static\js
npm.cmd run build
```

For Functions changes, also run:

```powershell
npm.cmd --prefix firebase\functions run build
npm.cmd --prefix firebase\functions run lint
```

## Firebase And QR Access

- `machine_access` must not contain machine-local `users`, password hashes, or
  salts.
- Machine QR login and operational updates should go through callable Functions,
  not unauthenticated direct Firestore writes.
- `machine_access_sessions` is backend-owned. Browser clients must not read or
  write it directly.
- Firebase App Check is enabled in two steps: deploy the client site key first,
  then enable callable enforcement only after normal browser and QR flows are
  verified.

## History And Clones

The repository history was rewritten during the 2026 public-repo cleanup. Use a
fresh clone when in doubt. Old local clones or local backup bundles may still
contain removed historical content.

