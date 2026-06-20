# Dashboard Model

## Entry Points

- `static/js/dashboard/index.js`: dashboard bootstrap, auth handling, machine loading, draft state, hooks passed into machine cards, auto-save, and Firebase client operations.
- `static/js/dashboard/data/`: live dashboard data subscriptions extracted from the bootstrap file. `dashboardSubscriptions.js` owns owner/admin/invite listeners, and `machineAccessSync.js` owns `machine_access` listeners for Tag ID operational patches.
- `static/js/dashboard/machineCardTemplate.js`: card creation entry.
- `static/js/dashboard/tabs/`: individual tab renderers.
- `static/js/dashboard/tabs/configuracion/`: configuration tab modules.
- `static/js/dashboard/i18n.js`: dashboard copy for Spanish and English.

## Machine Config

The configuration tab is split into modules. Tag ID and QR UI live in:

- `static/js/dashboard/tabs/configuracion/tag.js`

The administrator section also exposes ownership transfer for owner-view machines. Transfer requests create `machine_transfer_invites`; the recipient accepts/rejects from the topbar notification. The actual transfer is performed by backend callables so Firestore ownership, Storage document paths, Tag metadata, and machine access data move together.

Tag-related backend/client wrappers:

- `static/js/tokens/tagTokens.js`: creates Tag IDs.
- `static/js/dashboard/tagRepo.js`: validates/assigns tags.
- `static/js/dashboard/tags/tagAssetsRepo.js`: builds Tag URLs, generates QR, disconnects tags.
- `static/js/dashboard/machineAccessRepo.js`: syncs machine access data.

## General Tab Documents

Machine documentation UI lives in:

- `static/js/dashboard/tabs/general/general.js`
- `static/js/dashboard/cardHooks/documentHooks.js`
- `static/js/dashboard/documents/machineDocumentsRepo.js`

Current implemented scope:

- `Plate` / `Placa`: accepts JPG, PNG, and WebP images.
- `Manual`: accepts PDF files up to 25 MB.
- `Other documentation` / `Otra documentación`: accepts PDFs and JPG, PNG, or WebP images up to 25 MB each; supports multiple files and lists them below the upload tiles.
- Plate images are compressed/resized in the browser before upload.
- Uploads the image to Firebase Storage, not to the repository.
- Document hooks coordinate dashboard state, autosave persistence, storage-full checks, and UI status messages.
- `machineDocumentsRepo.js` owns file validation, compression, Storage paths, upload, download URL creation, and deletion.
- Stores single-file metadata in `machines.documents.<kind>` and additional documentation in `machines.documents.other[]`.
- Additional documentation can use `displayName` for a UI-only label, capped at 40 characters. Do not rename the underlying Storage object just to change the visible label.

## Dashboard Groups

Groups, the editable topbar dashboard title, and the global machine-card tab order are user dashboard layout preferences, not machine data. The layout is stored in Firestore at:

```text
dashboard_layout/{uid}
```

Current scope:

- Create groups by dragging one machine card onto the center of another card.
- Render group headers as collapsible sections.
- Move a machine into an existing group by dropping it onto a card in that group.
- Create one-level subgroups by dragging a group header onto another group.
- Reorder machines with drag and drop in the flat list, ungrouped list, and group bodies.
- Group headers expose a hover menu for renaming, deleting the group without deleting machines, and adding one empty child group under parent groups.
- Group records may include `parentGroupId`; nesting deeper than one sublevel is intentionally flattened.
- `dashboardTitle` stores the user's editable dashboard topbar title, capped at 32 characters. Empty value falls back to `Dashboard`.
- `tabOrder` stores the global order for machine-card tabs and applies to all machines. It is edited from the Settings/Configuración page preferences card.

Layout normalization lives in `static/js/dashboard/layout/dashboardLayoutModel.mjs`
and is shared by runtime rendering and Firestore save preparation. Future group
or tab-order changes should use that module instead of duplicating layout rules.
When saving from the dashboard, stale placements for machines no longer visible
to the account are pruned.

Layout mutations for drag/drop grouping and ordering live in
`static/js/dashboard/layout/dashboardLayoutActions.js`. Keep that module pure:
it should calculate groups, placements, and machine order changes, while
`index.js` remains responsible for UI prompts, autosave, persistence, and render.

Local consistency check:

```powershell
npm.cmd run check:nfc:layout
npm.cmd run check:nfc:architecture
```

This reads the latest local Firestore backup and reports invalid
`dashboard_layout` references such as missing machines, duplicate groups, or
subgroup nesting deeper than one level.

`check:nfc:architecture` is a source check. It verifies that the dashboard
bootstrap does not regain responsibilities already extracted into data,
layout, internal-view, card-hook, task-action, and loading modules.

## Dashboard-Level Views

The main dashboard page has internal hash views:

- `#/dashboard`: the normal machine-card and group view.
- `#/registro`: the global registry view.
- `#/sugerencias`: the collaborator suggestions view.
- `#/todo`: the private To Do view for `superadmin` and users enabled with `users/{uid}.todoAdmin`.

Files:

- `static/js/dashboard/index.js`: owns the view switch, section nav, disabled control state, and hash routing.
- `static/js/dashboard/views/dashboardInternalViews.js`: coordinates rendering for dashboard-level internal views such as `Registro` and `Sugerencias`.
- `static/js/dashboard/components/loading/dashboardLoadState.js`: centralizes owner/admin load-ready flags, load failures, init failure, and timeout behavior.
- `static/js/dashboard/components/loading/dashboardPlaceholders.js`: renders empty, load-error, and no-results dashboard placeholders.
- `static/js/dashboard/history/historyEventFormatter.js`: shared formatter and grouping helpers for machine history events. It preserves known legacy event text and falls back to `summary`, `message`, `messageKey`, or `type` for future events.
- `static/js/dashboard/views/registry/globalRegistryModel.js`: flattens logs from all machines visible to the current account, sorts them newest-first, and groups task notes under their task-created event.
- `static/js/dashboard/views/suggestions/`: renders and submits dashboard suggestions through callable functions.
- `static/js/dashboard/views/todo/`: renders and manages private To Do lists through separate callable functions.
- `static/js/dashboard/views/registry/globalRegistryView.js`: renders the global registry and `Cargar más` / `Load more` pagination.

Global registry scope:

- Uses only machines already visible to the current account, including owner and accepted-admin machines.
- Does not fetch hidden machines from other accounts.
- Shows 254 main log entries first, then each `Cargar más` click adds another 254 main entries.
- The global registry header includes a download action that exports the full filtered registry, not only the currently visible 254-entry page.
- The shared dashboard search input is active in `Registro` and filters the global registry by machine, location, formatted event text, task title/description, task note, user/admin fields, and common date formats.
- The `Registro` nav link shows a gray theme-aware badge with the number of unseen global registry rows/events. Unseen state is based on `dashboard_layout/{uid}.registrySeenAt`; accounts without that field initialize it on first load so old history does not appear as newly unread.
- While viewing `#/registro`, grouped blocks with activity newer than `registrySeenAt` render the block header with stronger text, and only the child rows whose own timestamp is newer than `registrySeenAt` also render stronger. The badge count uses the same block-level rule but counts one unseen item per updated block, not every visible child row. They are marked seen when the user leaves `#/registro`, not immediately on entry.
- Task child logs stay visually grouped under their related task creation when `taskId` or title fallback can match them. This includes notes, edits, completion, and removal events.
- When task notes are rendered under their parent task in the global registry, omit the repeated task title; the indentation already provides the context.
- Out-of-service operational cycles are grouped as one registry block when possible: status changed to `fuera_de_servicio`, the automatic restore task, notes/edits/completion for that task, and the return to `operativa`. The block sorts by its latest activity so long repairs move back to the top when updated.
- The add and order/filter controls remain visible in `Registro`, but are disabled until those features are explicitly implemented for the registry view.

Suggestions scope:

- The `Sugerencias` / `Suggestions` link appears only for `superadmin` or users with `users/{uid}.suggestionsCollaborator === true`.
- The collaborator flag is controlled from the superadmin control panel user list.
- Normal collaborators can submit and see their own suggestions. The superadmin can see all suggestions and gets an unseen badge over the `Sugerencias` nav link.
- Suggestions use callable functions instead of direct Firestore reads so global access stays behind the existing hashed superadmin check.

To Do scope:

- The `To do` link uses the superadmin violet accent when visible.
- The view is separate from suggestions and uses its own callable functions and `dashboard_todos` collection.
- `superadmin` and users marked with `users/{uid}.todoAdmin === true` see only their own To Do list.

History event contract:

- The machine history array remains the source of truth. The global registry should aggregate and render those events, not maintain its own list of known product actions.
- For new event types, store enough display data in the log itself: prefer `messageKey` plus `messageParams` for bilingual text, or `summary` / `message` when the text is already suitable for display.
- Keep `taskId` on task-related logs whenever possible so notes can remain grouped below their task creation event.

## Status-Linked Tasks

When a machine changes from `operativa` to `fuera_de_servicio`, the dashboard creates one pending one-off task with `source: "status-out-of-service"` to return the machine to operation. This behavior is account-independent and must apply to every dashboard user who can change the machine status, not only to the `superadmin`. Status-linked restore tasks are always rendered before ordinary tasks. Completing that task automatically changes the machine back to `operativa` and writes the status event to history. Changing the machine back to `operativa` manually only changes the machine status; it must not complete or remove the pending status-linked restore task, because notes or follow-up work may still need to be added. Do not duplicate this task while one pending status-linked restore task already exists.

Task implementation files:

- `static/js/dashboard/tabs/tasks/tasksModel.js`: task normalization, limits, and ordering. Current limits are 64 characters for titles, 1024 for descriptions, and 512 for notes.
- `static/js/dashboard/tabs/tasks/taskActions.js`: pure task/history mutations for create, remove, note, edit, complete, and the out-of-service/restore-operation cycle.
- `static/js/dashboard/tabs/tasks/tasksUI.js`: task list rendering, create/edit/note forms, complete button, and three-dot add-note/edit/delete menu.
- `static/js/dashboard/tabs/tasks/tasksTime.js`: frequency and due/overdue calculation, including custom frequency.
- `static/js/dashboard/cardHooks/taskHooks.js`: machine-card task hooks for create, remove, note, edit, and complete actions.
- `static/js/dashboard/tabs/historial.js`: history rendering. Task notes, task completion/edit events, and the status-linked return to `operativa` are grouped under the original task-created log when the log has a matching `taskId`; title fallback exists for older records.
- `static/js/dashboard/index.js`: still coordinates the machine-card render loop and passes shared state/dependencies into task hooks.

When creating task-related logs, include `taskId` whenever possible. This keeps history notes attached below the corresponding task creation record instead of appearing as independent chronological entries. Status-linked restore task logs should also carry `source: "status-out-of-service"` and `statusCycleId` so the global registry can keep the full operational cycle together.

## Current Tag/QR Flow

1. User generates or connects a Tag ID from machine config.
2. The dashboard validates/connects the Tag ID.
3. The dashboard automatically generates the QR through the existing QR callable.
4. The QR action is `View QR` / `Ver QR`.
5. `View QR` opens the QR print page with `?machineId=<id>` so only that QR is shown initially.
6. The QR print reload button fetches and shows the full QR list again.
7. Disconnecting the Tag ID must keep deleting associated QR metadata/storage.

## QR Print

Files:

- `nfc/es/impresion-qr.html`
- `nfc/en/qr-print.html`
- `static/js/qr-print/index.js`
- `static/css/qr-print.css`

Behavior:

- Fetch owner machines and administered machines.
- Include only machines with generated QR URLs, with fallback lookup in `tags` by `tagId`.
- Support temporary removal of QR cards from the print layout.
- Reload restores the full QR list.
- Size selector uses fixed size steps.
- Optional frame uses `static/img/LOGO unatomo v1.6 baseQR.jpg`.
- Optional back-name printing adds machine-name reverse pages to the same print job for printer duplex mode.

## Localization

When adding pages or menu links, update both Spanish and English where applicable:

- `nfc/es/...`
- `nfc/en/...`
- `static/js/site/locale.js`
- `static/js/registro/session-menu.js`
- Relevant i18n file, often `static/js/dashboard/i18n.js`.

## Superadmin UI

Use `superadmin` to describe UI/features that only the project owner account should see. In the current codebase this is implemented through the existing `control panel user` predicate:

- `nfc/controlpanel/access.js`
- `isControlPanelUser(userOrEmail)`

The special account email is not stored in plain text; access is checked by comparing the normalized email hash. The visible control panel link and any future owner-only controls should reuse this predicate.

Visual rule:

- Purple/violet `#7c3aed` is reserved for superadmin-only UI signals.
- The `Panel` link and the ES/EN topbar language toggle are superadmin-only signals.
- Machine Tag ID/NFC connected state is not superadmin UI and should use blue, not violet.
