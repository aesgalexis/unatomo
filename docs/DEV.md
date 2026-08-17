# Local Development

This is the authoritative setup and local-command guide. Publishing and
deployment instructions live in [DEPLOY_NOTES.md](DEPLOY_NOTES.md).

## Requirements

- Node.js 22.12.0 (recommended; 20.19+ supported)
- npm 11.0.0
- Firebase project credentials for live backend flows
- JDK 21 or newer for the Firestore and Storage emulator rules tests. The test
  runner also detects a portable JDK extracted under `.tools/jdk21/`.

Use `npm.cmd` in Windows PowerShell if the execution policy blocks `npm`.

## Setup

```powershell
npm.cmd install
copy .env.example .env.local
copy .firebaserc.example .firebaserc
npm.cmd run dev
```

Fill `.env.local` with the Firebase web configuration and `.firebaserc` with
the local project alias. The generated
`static/js/config/runtime-config.js` is ignored and must not be committed with
real values.

## Development Commands

```powershell
npm.cmd run dev
npm.cmd run dev:static
npm.cmd run dev:machine-lab
```

Use `dev:static` as the fallback if Vite fails. Run `npm.cmd run doctor` to
diagnose dependency or Node-version problems.

## Validation

Choose checks proportionally to the change:

```powershell
npm.cmd test
npm.cmd run test:rules
node scripts\syntax-scan.mjs static\js
npm.cmd run build
npm.cmd run lint:links
npm.cmd run scan:secrets
npm.cmd run check:nfc:architecture
```

`npm.cmd test` runs the NFC architecture and behavior checks, the Firebase
Functions lint and policy tests, Firestore and Storage emulator rules tests,
link validation, and the secret scan. `npm.cmd run test:rules` runs the rules
contract independently against the local Firebase emulators. The
layout-backup integrity check remains a separate production-data diagnostic:
`npm.cmd run check:nfc:layout`.

`npm.cmd run build` does not update the tracked code statistics. Run
`npm.cmd run stats:code` only when those statistics should be refreshed.
