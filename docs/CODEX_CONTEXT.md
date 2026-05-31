# Codex Context

## What This Project Is

Unatomo is a static web app with a Firebase backend. The active operational area is the NFC/dashboard app under `nfc/`, supported by frontend code in `static/` and Firebase Functions/rules in `firebase/`.

The dashboard manages machines, users, tasks, history, notifications, administrators, Tag IDs, machine access pages, and QR printing.

## Main Paths

- `nfc/es/` and `nfc/en/`: localized dashboard/auth/static pages.
- `static/js/dashboard/`: dashboard bootstrap, machine state, cards, tabs, repositories, Firebase client calls.
- `static/js/dashboard/tabs/configuracion/`: machine configuration UI.
- `static/js/dashboard/tags/`: Tag ID URL, QR generation, and disconnect client wrappers.
- `static/js/qr-print/index.js`: QR print page logic.
- `static/css/dashboard.css`: dashboard and machine-card styles.
- `static/css/qr-print.css`: QR print layout and print-specific CSS.
- `static/js/site/locale.js`: language detection and localized path mapping.
- `static/js/registro/session-menu.js`: authenticated user menu.
- `firebase/functions/src/index.ts`: callable backend functions.
- `scripts/`: local build, static server, publish, syntax, and maintenance scripts.

## Current Important Features

- Dashboard cards are rendered from `static/js/dashboard/index.js` and component modules.
- Machine config includes administrator assignment, users, notifications, Tag ID, URL, and QR controls.
- Tag ID creation now automatically creates the QR; there are no manual generate/regenerate QR buttons.
- The QR action in machine config is `View QR` / `Ver QR`; it opens QR print focused on one machine.
- QR print can reload to show all available QR codes, temporarily remove items from the print layout, resize QR output, and optionally use the Unatomo frame image.
- Disconnecting a Tag ID must also remove the associated QR to avoid stale database/storage data.

## Working Style

Before editing, read the smallest relevant module and follow existing patterns. The codebase is mostly vanilla JS modules plus Firebase CDN imports. Avoid broad refactors unless the requested change requires them.

