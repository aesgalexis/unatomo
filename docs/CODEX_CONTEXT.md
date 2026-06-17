# Codex Context

## What This Project Is

Unatomo is a static web app with a Firebase backend. The active operational area is the NFC/dashboard app under `nfc/`, supported by frontend code in `static/` and Firebase Functions/rules in `firebase/`.

The dashboard manages machines, users, tasks, history, notifications, administrators, Tag IDs, machine access pages, and QR printing.

Project-owner-only UI is called `superadmin` in conversation and docs. In code it currently maps to the `control panel user` check in `nfc/controlpanel/access.js`. Purple/violet `#7c3aed` is reserved for superadmin-only UI signals, such as the `Panel` link and the topbar ES/EN language toggle. Ordinary machine states, Tag ID, NFC, and administrator relationships should not use violet.

## Main Paths

- `nfc/es/` and `nfc/en/`: localized dashboard/auth/static pages.
- `static/js/dashboard/`: dashboard bootstrap, machine state, cards, tabs, repositories, Firebase client calls.
- `static/js/dashboard/history/`: shared history event formatting and grouping helpers.
- `static/js/dashboard/views/`: dashboard-level views that are not machine-card tabs, such as the global registry.
- `static/js/dashboard/tabs/configuracion/`: machine configuration UI.
- `static/js/dashboard/tags/`: Tag ID URL, QR generation, and disconnect client wrappers.
- `static/js/qr-print/index.js`: QR print page logic.
- `static/css/dashboard.css`: dashboard and machine-card styles.
- `static/css/qr-print.css`: QR print layout and print-specific CSS.
- `static/js/site/locale.js`: language detection and localized path mapping.
- `static/js/registro/session-menu.js`: authenticated user menu.
- `firebase/functions/src/index.ts`: callable backend functions.
- `scripts/`: local build, static server, publish, syntax, and maintenance scripts.
- `docs/PRODUCT_NOTES.md`: lightweight product-direction notes from owner conversations; context only, not hard rules.

## Current Important Features

- Dashboard cards are rendered from `static/js/dashboard/index.js` and component modules.
- Machine config includes administrator assignment, users, notifications, Tag ID, URL, and QR controls.
- Tag ID creation now automatically creates the QR; there are no manual generate/regenerate QR buttons.
- The QR action in machine config is `View QR` / `Ver QR`; it opens QR print focused on one machine.
- QR print can reload to show all available QR codes, temporarily remove items from the print layout, resize QR output, and optionally use the Unatomo frame image.
- Disconnecting a Tag ID must also remove the associated QR to avoid stale database/storage data.
- Machine tasks support title, description, frequency, custom frequency, notes, edit, completion, and delete. The task action menu uses a three-dot menu for add-note/edit/delete.
- Changing a machine to `fuera_de_servicio` creates a one-off restore task for all permitted dashboard users. That status-linked task is always rendered before ordinary tasks and completing it restores the machine to `operativa`.
- The dashboard has internal views at `#/dashboard` and `#/registro`. `Registro` shows a global registry made from the histories of all machines visible to the current account.
- The dashboard also has `#/sugerencias`. It is visible only to `superadmin` or users marked as `suggestionsCollaborator` from the control panel.
- The `superadmin` control panel has a `Respaldo` / `Backup` card. It reads `static/data/nfc-backup-status.json`, which is updated by the local NFC backup scripts.
- Global registry event text comes from `static/js/dashboard/history/historyEventFormatter.js`; new history event types should provide `summary`, `message`, or `messageKey` so the global registry can show them without view-specific code.
- The dashboard topbar title is editable per user and stored as `dashboard_layout/{uid}.dashboardTitle` with a 32-character cap; empty value falls back to `Dashboard`.
- Dashboard initialization is intentionally guarded against duplicate auth emissions. Loading failures should not be presented as an empty account; show a load-error state until Firebase data arrives or the user reloads.

## Working Style

Before editing, read the smallest relevant module and follow existing patterns. The codebase is mostly vanilla JS modules plus Firebase CDN imports. Avoid broad refactors unless the requested change requires them.

The owner usually tests unpublished local changes in Microsoft Edge and checks published changes in Chrome. When investigating UI glitches, account for browser-specific autofill, focus, and scroll anchoring behavior in Edge as well as Chrome.

## Product Feel

Added: 2026-06-07

The project should feel alive and directional, but not fragile. As features grow, prioritize load stability, small reliability fixes, and visual coherence so the app keeps feeling clear and trustworthy while new functionality is added.

For product-direction discussions, check `docs/PRODUCT_NOTES.md`. It captures provisional thinking about incidents, quick mobile photos, registry/read states, and avoiding a generic chat product.

## Recent Continuity Notes

Updated: 2026-06-16 15:58 Europe/Madrid

- Last successful publish from this workspace pushed commit `5870cdf` to `main`.
- Owner-requested local browser workflow: unpublished changes are usually tested in Microsoft Edge; published changes are checked in Chrome.
- Before future task/history work, inspect `static/js/dashboard/tabs/tasks/`, `static/js/dashboard/tabs/historial.js`, and the hooks in `static/js/dashboard/index.js` around task add/edit/remove/complete.
