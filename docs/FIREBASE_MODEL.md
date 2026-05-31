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
  - `users`
  - `tasks`
  - `logs`
- `tags`: Tag ID registry and QR metadata. Important fields include:
  - `tagId`
  - `machineId`
  - `ownerUid`
  - `url`
  - `qrUrl`
  - `qrPath`
- `machine_access`: public/operational access data keyed by Tag ID.
- `admin_machine_links`: accepted admin access links.
- `admin_invites`: pending/accepted admin invitations.
- Account directory/registry collections may exist for account lookup and admin display names; inspect the repo before changing them.

Machine documents are stored as metadata on `machines.documents`. The actual files live in Firebase Storage under:

```text
machine-docs/{ownerUid}/{machineId}/plate/{fileName}
machine-docs/{ownerUid}/{machineId}/manual/{fileName}
```

Implemented document types are `plate`, intended for machine plate photos, and `manual`, intended for PDF manuals up to 25 MB. Do not store uploaded files in the repository.

## Callable Functions

Backend callables live in `firebase/functions/src/index.ts`. Common frontend wrappers live under `static/js/dashboard/`.

- `assignMachineTag`: assigns an existing Tag ID to a machine and updates access data.
- `generateMachineTagQr`: generates/stores a QR PNG and writes `tagQrUrl`, `tagQrPath`, `qrUrl`, and `qrPath` metadata.
- `disconnectMachineTag`: disconnects Tag ID data and deletes the associated QR file/path. Preserve this cleanup behavior.

## Tag ID And QR Rules

- Creating or connecting a Tag ID should result in a QR automatically.
- Manual `Generate QR` / `Regenerate QR` controls should not be required in the dashboard.
- The machine config QR action should take the user to QR print focused on that machine.
- If a Tag ID is disconnected, the QR must be removed as part of the disconnect flow.
- Avoid introducing alternate QR creation paths that bypass the canonical callable unless there is a clear reason.

## Production Safety

One-off Firebase maintenance scripts should be temporary. If a script is created to transfer ownership, inspect accounts, or modify production data, remove it once the operation is complete unless the user explicitly asks to keep it.

Storage rules live in `firebase/storage.rules` and are referenced by `firebase.json`.
