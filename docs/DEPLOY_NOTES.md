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

`static/js/config/runtime-config.js` is intentionally versioned as a public
Firebase web-config fallback so the deployed dashboard does not fail with a
404 before Firebase initializes. `generate-config.mjs` still refreshes it from
`.env.local`, `.env`, or GitHub Actions secrets when values are available; if
env values are missing, it preserves the existing checked-in values instead of
blanking the file.

## Publish

```powershell
npm.cmd run site:publish
```

This generates runtime config, builds the static site, commits when there are changes, and attempts to push.

If push is rejected with `fetch first`, the remote branch has commits not present locally. Fetch/integrate remote changes before pushing. Do not force push unless the user explicitly asks and the remote state has been reviewed.

Recent known-good publish:

- `2026-06-16 15:58 Europe/Madrid`: `npm run site:publish` succeeded through explicit PowerShell invocation after sandbox startup retries, committed `5870cdf Update site (2026-06-16 15:58:17)`, and pushed `main` to GitHub.

## Firebase

Firebase artifacts live under `firebase/`:

- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`
- `firebase/functions`

Be careful with production callable functions and data scripts. Temporary scripts for Firebase data maintenance should not remain in the repository after use unless explicitly requested.
