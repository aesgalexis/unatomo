# Deploy Notes

## Local Validation

PowerShell may block `npm` through `npm.ps1`. Prefer `npm.cmd` when needed.

```powershell
node scripts\syntax-scan.mjs static\js
npm.cmd run build
```

Useful additional checks:

```powershell
npm.cmd run lint:links
npm.cmd run scan:secrets
npm.cmd run doctor
```

## Static Build

`npm.cmd run build` runs:

- `node scripts/generate-config.mjs`
- `node scripts/build-static.mjs`

The static output is written to `dist/`.

## Publish

```powershell
npm.cmd run site:publish
```

This generates runtime config, builds the static site, commits when there are changes, and attempts to push.

If push is rejected with `fetch first`, the remote branch has commits not present locally. Fetch/integrate remote changes before pushing. Do not force push unless the user explicitly asks and the remote state has been reviewed.

## Firebase

Firebase artifacts live under `firebase/`:

- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`
- `firebase/functions`

Be careful with production callable functions and data scripts. Temporary scripts for Firebase data maintenance should not remain in the repository after use unless explicitly requested.

