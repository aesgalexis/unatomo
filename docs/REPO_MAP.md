# Repository Map

This map is the quick human entry point. Deeper operating notes live in the
feature-specific docs.

## Root

- `README.md`: public entry point and setup summary.
- `package.json`: scripts, metadata, and Node/npm version hints.
- `firebase.json`: Firebase Hosting/Firestore/Storage/Functions configuration.
- `.env.example`: template for local Firebase web config.
- `AGENTS.md`: operating instructions for coding agents.

## Product And Pages

- `index.html`: public root page.
- `landing/`: public landing pages and landing-specific scripts/styles.
- `es/` and `en/`: localized public routes.
- `nfc/es/` and `nfc/en/`: localized NFC/dashboard/auth/static pages.
- `nfc/controlpanel/`: owner-only control panel UI.
- `demo/`: local/demo app surfaces.

## Frontend Source

- `static/js/dashboard/`: dashboard bootstrap, runtime, rendering, data,
  machine cards, hooks, views, and tabs.
- `static/js/firebase/`: Firebase client initialization.
- `static/js/qr-print/`: QR print page logic.
- `static/js/registro/`: registration, login, reset, and session menu logic.
- `static/js/site/`: locale and site-level preferences.
- `static/css/dashboard.css`: dashboard stylesheet manifest.
- `static/css/dashboard/`: split dashboard styles by feature.
- `static/css/qr-print.css`: QR print layout and print CSS.

## Firebase

- `firebase/firestore.rules`: Firestore security rules.
- `firebase/storage.rules`: Storage security rules.
- `firebase/firestore.indexes.json`: Firestore indexes.
- `firebase/functions/src/`: callable Functions source split by domain.

Read [FIREBASE_MODEL.md](FIREBASE_MODEL.md) before changing ownership, admin
links, Tag ID, QR cleanup, callable Functions, or data permissions.

## Scripts

- `scripts/build-static.mjs`: static build output to `dist/`.
- `scripts/generate-config.mjs`: generates runtime Firebase config.
- `scripts/dev-server.mjs`: simple static development server.
- `scripts/site-publish.mjs`: owner-run publish helper.
- `scripts/firebase-clean.mjs`: Firebase CLI wrapper used by deploy scripts.
- `scripts/scan-secrets.mjs`: local secret scan.
- `scripts/check-nfc-architecture.mjs`: dashboard architecture guard.
- `scripts/backup-*-nfc.mjs`: owner-run/read-only NFC backup helpers.

## Documentation Routing

- `docs/PROJECT_OVERVIEW.md`: what the product does and why it exists.
- `docs/DEV.md`: local setup and development commands.
- `docs/DASHBOARD_MODEL.md`: dashboard, cards, Tag ID, QR print, menu, and i18n.
- `docs/FIREBASE_MODEL.md`: Firebase data flows and permission model.
- `docs/FUNCTIONS_ARCHITECTURE.md`: callable Functions structure.
- `docs/DEPLOY_NOTES.md`: publish/deploy policy and commands.
- `docs/WHATS_NEW_POLICY.md`: public What's New/Novedades policy.

## Ignored Local Data

- `node_modules/`
- `dist/`
- `.vite/`
- `.backups/`
- `.env*` except `.env.example`
- `codex-memory/`

Do not commit secrets, backup snapshots, local memory notes, service-account
files, or private production data.
