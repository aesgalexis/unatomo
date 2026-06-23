# Codex Context

## What This Project Is

Unatomo is a static web app with a Firebase backend. The active operational area is the NFC/dashboard app under `nfc/`, supported by frontend code in `static/` and Firebase Functions/rules in `firebase/`.

The dashboard manages machines, users, tasks, history, notifications, administrators, Tag IDs, machine access pages, and QR printing.

Project-owner-only UI is called `superadmin` in conversation and docs. In code it currently maps to the `control panel user` check in `nfc/controlpanel/access.js`. Purple/violet `#7c3aed` is reserved for superadmin-only UI signals, such as the `Panel` link and the topbar ES/EN language toggle. Ordinary machine states, Tag ID, NFC, and administrator relationships should not use violet.

## Main Paths

- `nfc/es/` and `nfc/en/`: localized dashboard/auth/static pages.
- `static/js/dashboard/`: dashboard bootstrap, machine state, cards, tabs, repositories, Firebase client calls.
- `static/js/dashboard/data/`: live Firebase dashboard subscriptions and `machine_access` sync.
- `static/js/dashboard/cardHooks/`: machine-card hook installers split by feature area, currently tasks and documents.
- `static/js/dashboard/history/`: shared history event formatting and grouping helpers.
- `static/js/dashboard/layout/`: dashboard layout normalization and pure drag/drop layout actions.
- `static/js/dashboard/runtime/`: dashboard state, session, data, autosave,
  viewport, title, and mobile runtime controllers.
- `static/js/dashboard/controllers/`: top-level navigation, loading, ordering,
  internal-view, topbar, and machine-access controllers.
- `static/js/dashboard/rendering/`: group/card rendering and machine-card hook
  installers split by core, Tag ID, users, and management responsibilities.
- `static/js/dashboard/views/`: dashboard-level views that are not machine-card tabs, such as the global registry.
- `static/js/dashboard/components/loading/`: dashboard loading, error, timeout, and placeholder helpers.
- `static/js/dashboard/tabs/configuracion/`: machine configuration UI.
- `static/js/dashboard/tags/`: Tag ID URL, QR generation, and disconnect client wrappers.
- `static/js/qr-print/index.js`: QR print page logic.
- `static/css/dashboard.css`: stable dashboard stylesheet manifest.
- `static/css/dashboard/`: dashboard and machine-card styles split by feature;
  read `docs/DASHBOARD_CSS.md` before changing file boundaries or import order.
- `static/css/qr-print.css`: QR print layout and print-specific CSS.
- `static/js/site/locale.js`: language detection and localized path mapping.
- `static/js/registro/session-menu.js`: authenticated user menu.
- `static/js/sections/novedades.js` and `static/js/sections/whatsNewData.js`: public `Novedades` / `What's new` section.
- `firebase/functions/src/index.ts`: export-only public callable entry point.
- `firebase/functions/src/core/` and `firebase/functions/src/dashboard/`:
  shared backend infrastructure and extracted callable domains. Read
  `docs/FUNCTIONS_ARCHITECTURE.md` before structural Functions work.
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
- The same collaborator flag enables `#/todo`; To Do has no separate admin
  role. Shared To Do items use one document, participant completion, and
  owner-only deletion.
- Accounts may claim and change a public `accountHandle` from Settings. Previous
  names remain reserved aliases for the same UID for 90 days and changes are
  retained internally in `account_handle_history`.
  Firebase Auth `uid` remains canonical for every durable relationship. To-do
  mentions prefer account handles and retain the email-local alias only as a
  compatibility fallback. Do not confuse `account_handles` with the existing
  machine-user `usernames` collection.
- The `superadmin` control panel has a `Respaldo` / `Backup` card. It reads `static/data/nfc-backup-status.json`, which is updated by the local NFC backup scripts. Prefer `npm.cmd run backup:nfc:all`; the panel shows its aggregate status, age, included scope, and explicitly pending recovery scopes above the Firestore, Storage, and Firebase Authentication details.
- The control panel starts with read-only `Estado del sistema` and `Integridad
  de datos` cards backed by the superadmin-only
  `getControlPanelSystemStatus` callable. The first integrity phase validates
  Firestore/Auth relationships for machines, owners, Tags, access records,
  administrator links, invitations, and transfers; Storage object existence
  remains explicitly out of scope.
- Global registry event text comes from `static/js/dashboard/history/historyEventFormatter.js`; new history event types should provide `summary`, `message`, or `messageKey` so the global registry can show them without view-specific code.
- The dashboard topbar title is editable per user and stored as `dashboard_layout/{uid}.dashboardTitle` with a 32-character cap; empty value falls back to `Dashboard`.
- Dashboard initialization is intentionally guarded against duplicate auth emissions. Loading failures should not be presented as an empty account; show a load-error state until Firebase data arrives or the user reloads.
- Dashboard layout normalization is centralized in `static/js/dashboard/layout/dashboardLayoutModel.mjs`; use `npm.cmd run check:nfc:layout` against a fresh backup before/after risky group or layout work.
- Dashboard groups support depth 0-2 through the existing `parentGroupId`
  relation. `Añadir grupo superior` wraps an existing subtree so a new root
  container can be created without moving its machines. Use
  `npm.cmd run check:nfc:group-hierarchy` after hierarchy changes.
- Persist group hierarchy through `saveDashboardGroupLayout`; Firestore rules
  intentionally reject direct browser writes to dashboard `groups` and
  `placements`.
- Dashboard architecture is intentionally split: `index.js` owns bootstrap and
  dependency composition; runtime, controllers, and rendering modules own
  session/data state, navigation, layout mutations, internal views, machine
  cards, hooks, and loading/error behavior.
- Firebase Functions are split by domain while preserving the callable exports
  from `firebase/functions/src/index.ts`. Firebase Admin
  initialization and shared collection refs live in `core/firebase.ts`; do not
  initialize Admin independently inside domain modules.
- Run `npm.cmd run check:nfc:architecture` after dashboard architecture changes to catch responsibilities drifting back into `index.js`.
- Public `Novedades` entries are static and governed by `docs/WHATS_NEW_POLICY.md`. Check `docs/codex-flags.json` before adding entries.

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
- Before future task/history work, inspect `static/js/dashboard/tabs/tasks/`,
  `static/js/dashboard/tabs/historial.js`, and the installers under
  `static/js/dashboard/rendering/hooks/` and `cardHooks/`.
- After the 2026-06 architecture pass, task hooks live in `static/js/dashboard/cardHooks/taskHooks.js` and task/history mutations live in `static/js/dashboard/tabs/tasks/taskActions.js`; prefer those before editing `index.js`.
