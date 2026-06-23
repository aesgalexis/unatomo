# Firebase Model

Read this before changing data flows, callable functions, machine ownership, admin assignment, Tag IDs, QR generation, or cleanup behavior.

## Main Collections

- `machines`: canonical machine records. Important fields include:
  - `id`
  - `ownerUid`
  - `ownerEmail`
  - `tenantId` in frontend draft state
  - `adminEmail`
  - `adminStatus`
  - `tagId`
  - `tagUrl`
  - `tagQrUrl`
  - `tagQrPath`
  - `tagQrSize`
  - `users`
  - `tasks`
  - `logs`
  - `activeStatusCycleId` while an out-of-service restore cycle is active
- `tags`: Tag ID registry and QR metadata. Important fields include:
  - `tagId`
  - `machineId`
  - `ownerUid`
  - `url`
  - `qrUrl`
  - `qrPath`
  - `qrSize`
- `machine_access`: public/operational access data keyed by Tag ID.
- `admin_machine_links`: accepted admin access links.
- `admin_invites`: pending/accepted admin invitations.
- `machine_transfer_invites`: pending/accepted/rejected machine ownership transfer requests.
- `dashboard_layout/{uid}`: per-user dashboard grouping/layout preferences. Groups may include `parentGroupId` for one-level subgroups; `dashboardTitle` stores the user's editable dashboard topbar title; `registrySeenAt` stores the last time the user left the global registry view after seeing current activity; `machineViewMode` and `machineSortMode` store dashboard display preferences.
- `dashboard_suggestions`: collaborator suggestions submitted from `#/sugerencias`. Normal collaborators see their own suggestions; `superadmin` sees all through callable functions.
- `dashboard_todos`: dashboard To Do items managed through callable functions.
  Private items belong only to `ownerUid`. Shared items keep one canonical
  document with `participantUids`, `owner`, and `sharedWith`: every participant
  may complete or reopen it, while only `ownerUid` may delete it. Mentions
  currently resolve from the local part of an enabled user's email address.
- `users/{uid}.suggestionsCollaborator`: superadmin-controlled boolean that
  enables both the `Sugerencias` and `To do` views for that user.
- `account_directory`: account lookup and display metadata keyed by normalized
  email.
- `account_handles`: immutable public account-handle index keyed by normalized
  handle. It maps one handle to one Firebase Auth `uid` and is separate from
  `usernames`, which stores machine-local credentials.

Machine documents are stored as metadata on `machines.documents`. The actual files live in Firebase Storage under:

```text
machine-docs/{ownerUid}/{machineId}/plate/{fileName}
machine-docs/{ownerUid}/{machineId}/manual/{fileName}
machine-docs/{ownerUid}/{machineId}/other/{fileName}
```

Implemented document types are `plate`, intended for machine plate photos; `manual`, intended for one PDF manual up to 25 MB; and `other`, an array of additional PDFs or images up to 25 MB each. Do not store uploaded files in the repository.

Incident images selected while changing a machine to `fuera_de_servicio` are
stored as ordinary `machines.documents.other[]` entries. Linked entries may
include `context: "task-attachment"`, `linkedTaskId`, and
`linkedStatusCycleId`; the corresponding task keeps attachment references and
the history log stores a `task_attachment_added` event.

Ownership transfers are accepted through Cloud Functions, not by direct client writes. The function validates that the recipient exists in `account_directory`, rewrites the machine owner fields, copies any Storage object referenced by `machines.documents.*.storagePath` from `machine-docs/{oldOwnerUid}/{machineId}/...` to `machine-docs/{newOwnerUid}/{machineId}/...`, updates document URLs/paths, updates Tag/QR ownership metadata, and leaves the previous owner as an accepted administrator.

## Account Storage Limit

Each account is limited to 1 GB of stored machine assets. The usage model sums:

- `machines.documents.*.size` for uploaded plates and manuals, plus array entries such as `machines.documents.other[].size`.
- `machines.tagQrSize` / `tags.qrSize` for generated Tag ID QR PNG files.
- Existing QR metadata/path fallback for older records that do not yet have a stored size.

When the account is full, the dashboard must block plate uploads, manual uploads, Tag ID generation, and QR generation. The topbar notification bell must keep showing the storage-full notification until usage drops below the limit. Backend callables `createMachineTagToken` and `generateMachineTagQr` also enforce the limit with `resource-exhausted: storage-full`.

## Callable Functions

Backend callables live in `firebase/functions/src/index.ts`. Common frontend wrappers live under `static/js/dashboard/`.

- `assignMachineTag`: assigns an existing Tag ID to a machine and updates access data.
- `generateMachineTagQr`: generates/stores a QR PNG and writes `tagQrUrl`, `tagQrPath`, `tagQrSize`, `qrUrl`, `qrPath`, and `qrSize` metadata.
- `disconnectMachineTag`: disconnects Tag ID data and deletes the associated QR file/path. Preserve this cleanup behavior.
- `setControlPanelUserCollaborator`: superadmin-only toggle for suggestion collaborators.
- `createDashboardSuggestion`: creates a suggestion for `superadmin` or an enabled collaborator.
- `listDashboardSuggestions`: lists own suggestions for collaborators and all suggestions for `superadmin`.
- `markDashboardSuggestionsSeen`: stores the superadmin suggestions seen timestamp.
- `listDashboardTodos`, `createDashboardTodo`, `updateDashboardTodo`,
  `deleteDashboardTodo`: manage private and shared To Do items. Shared
  participants may update completion state; deletion remains owner-only.
- `listDashboardTodoCollaborators`: returns enabled collaborators for the To Do
  mention autocomplete; it is available only to To Do users. Account handles
  are preferred, with the legacy email-local mention retained for accounts
  that have not claimed a handle.
- `checkAccountHandleAvailability`, `claimAccountHandle`: validate and reserve
  an immutable public account handle transactionally in
  `account_handles/{handle}` and `users/{uid}`. Direct browser writes to the
  handle index are forbidden.
- `getControlPanelSystemStatus`: superadmin-only, read-only production overview.
  It reports service availability and product totals, then checks machine
  owners, Tag assignments, `machine_access`, administrator links, pending
  invitations, and pending transfers for broken Firestore relationships. It
  returns only counts and bounded samples. Physical Storage object existence is
  intentionally not checked yet.
- `saveDashboardGroupLayout`: authenticated layout writer for `groups` and
  `placements`. It validates unique IDs, existing parents, cycles, placements,
  and maximum group depth 2 before writing. Firestore rules block direct client
  changes to those two fields so stale dashboard code cannot flatten a saved
  hierarchy.

## Tag ID And QR Rules

- Creating or connecting a Tag ID should result in a QR automatically.
- Manual `Generate QR` / `Regenerate QR` controls should not be required in the dashboard.
- The machine config QR action should take the user to QR print focused on that machine.
- If a Tag ID is disconnected, the QR must be removed as part of the disconnect flow.
- Avoid introducing alternate QR creation paths that bypass the canonical callable unless there is a clear reason.

## Account Identity

- Firebase Authentication `uid` is canonical for ownership, permissions,
  participants, Storage paths, and durable relationships.
- `accountHandle` is a public lookup and display alias. Resolve it to a `uid`
  before an operation and persist the `uid`, never the handle, as the durable
  relationship key.
- Email remains valid for sign-in, recovery, and legacy invitation flows.
- Never reuse `usernames` for account handles; that collection belongs to
  machine-local operational users.

## Production Safety

One-off Firebase maintenance scripts should be temporary. If a script is created to transfer ownership, inspect accounts, or modify production data, remove it once the operation is complete unless the user explicitly asks to keep it.

Storage rules live in `firebase/storage.rules` and are referenced by `firebase.json`.
