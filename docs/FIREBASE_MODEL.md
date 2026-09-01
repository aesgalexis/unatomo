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
- `machine_access`: operational access data keyed by Tag ID. Unauthenticated
  clients receive only a server-sanitized public projection; the document
  itself is not public Firestore data. `qrAccessEnabled` defaults to enabled
  when absent and can suspend QR/NFC access without disconnecting the Tag ID.
- `machine_access_sessions`: short-lived QR/machine sessions created by
  callable functions after a machine-local user login. Browser clients must not
  read or write this collection directly.
- `admin_machine_links`: accepted admin access links.
- `admin_invites`: pending/accepted admin invitations.
- `machine_transfer_invites`: pending/accepted/rejected machine ownership transfer requests.
- `dashboard_layout/{uid}`: per-user dashboard grouping/layout preferences. Groups may include `parentGroupId` for one-level subgroups; `dashboardTitle` stores the user's editable dashboard topbar title; `registrySeenAt` stores the last time the user left the global registry view after seeing current activity; `machineViewMode` and `machineSortMode` store dashboard display preferences.
- `user_notification_preferences/{uid}`: account-wide operational notification preferences. Version 2 stores the `email` channel, its explicit `machineOutOfService` and `machineOperationalAgain` events, and the scopes `receiveOwnedMachines`, `notifyAdministrators` and `receiveAdministeredMachines`. It is owned and writable only by that user; it never stores a recipient address, because delivery resolves the authenticated account address server-side. Legacy documents keep owner delivery enabled by default, while both administrator-routing choices default to disabled.
- `user_notifications`: private persistent account inbox for access changes,
  invitation/transfer outcomes, and account-linked task assignments. Backend
  code creates notifications before access relationships disappear; clients
  may read their own documents and update only `readAt`. Machine operational
  status transitions are deliberately excluded from this inbox.
- `admin_invite_email_batches`: server-only five-minute sliding batches for
  administrator-invitation email. Batches are scoped by owner and recipient,
  deduplicate machines, and produce one bilingual `email_outbox` message when
  the window expires. Browser reads and writes are denied.
- `machine_domain_events`: server-only canonical lifecycle events. Version 1
  records `machine_out_of_service` and `machine_operational_again` with the
  machine, owner, actor, status cycle and restoration-task identifiers.
  Browser reads and writes are denied.
- `dashboard_suggestions`: collaborator suggestions submitted from `#/sugerencias`. Normal collaborators see their own suggestions; `superadmin` sees all through callable functions.
- `dashboard_todos`: legacy personal/shared task documents. The dashboard no
  longer reads this collection; account-wide Tasks are derived from the
  canonical `machines.tasks` arrays visible through owner/admin access. Remove
  legacy documents only through an explicitly approved production cleanup.
- `users/{uid}.suggestionsCollaborator`: superadmin-controlled boolean that
  enables `Sugerencias`; it no longer controls the machine Tasks view.
- New profiles are created with `users/{uid}.onboardingRequired: true`. The
  authenticated onboarding callable clears it and records the submitted
  profile fields plus `onboardingCompletedAt`; existing profiles without the
  flag are not retroactively gated.
- Accounts may own at most 64 canonical `machines` documents. Machines visible
  through accepted administrator access do not count. The existing control-panel
  `superadmin` account is exempt. Browser clients cannot create machine documents
  directly; `createOwnedMachine` enforces the limit transactionally. Onboarding
  applies the same policy before creating its initial machine records.
- `registration_codes`: unused, active single-use account registration codes.
- `access_requests`: private access applications keyed by a SHA-256 email hash;
  server-only review state and generated-code audit metadata.
  The backend atomically creates `users/{uid}` and deletes the redeemed code.
  User profiles do not retain the code that created them. Browser clients
  cannot read or write this collection directly.
- `account_directory`: account lookup and display metadata keyed by normalized
  email.
- `account_handles`: public account-handle index keyed by normalized handle.
  Active names and permanently reserved aliases map to one Firebase Auth `uid`.
- `account_handle_history`: permanent internal audit of account-handle changes.
  It is not exposed in account settings.
  Both collections are separate from `usernames`, which stores machine-local
  credentials.
- `public_metrics/nfc`: aggregate-only landing metrics written by the backend.
  The public client may read this one document, but cannot list the collection
  or write any metric. It contains only machine, registered-profile, linked-tag
  counts, a schema version, and the last backend update timestamp.
- `laundry_public_catalog`: published Laundry Services catalogue used by the
  public spare-parts form. `meta` identifies the active manufacturer documents,
  `categories` stores localized machine categories, and each
  `manufacturer_{id}` document contains one manufacturer with its model groups
  and spare-part records. Public clients may read this collection but cannot
  write it. Only accounts with the `laundryServicesAdmin` custom claim may
  create or update schema-valid documents; deletion is denied. Browser writes
  record the authenticated UID in `publishedBy`. The private, noindex editor is
  `/laundryservices/catalogo/`. The checked-in migration
  snapshot lives under `firebase/catalog/`, outside the public website, and is
  synchronized with the owner-run catalogue command.
- `agregador_maquinaria_LS`: public used-machinery records. Only accounts with
  the `laundryServicesAdmin` claim may create or update them. Records are
  unpublished with `visible: false` instead of deleted. Their public images live
  under `maquinaria/{machineId}/`; only that claim may create, replace, or clean
  those objects.

Machine documents are stored as metadata on `machines.documents`. The actual files live in Firebase Storage under:

```text
machine-docs/{ownerUid}/{machineId}/plate/{fileName}
machine-docs/{ownerUid}/{machineId}/manual/{fileName}
machine-docs/{ownerUid}/{machineId}/other/{fileName}
```

Profile avatars live separately at `profile-avatars/{uid}/avatar.webp`. The
owner may read, create, replace, or delete only this fixed object. The browser
converts uploaded JPEG/PNG/WebP images to a 512 px WebP before upload; Storage
enforces a 1 MB maximum. The avatar URL is kept in Firebase Auth and
`users/{uid}.photoURL`; it is intentionally not copied to `account_directory`.

Implemented document types are `plate`, intended for machine plate photos; `manual`, intended for one PDF manual up to 25 MB; and `other`, an array of additional PDFs or images up to 25 MB each. The General-tab UI limits each `other` selection to 10 files and 100 MB total before uploading. Do not store uploaded files in the repository.

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

Backend callables are exported publicly from
`firebase/functions/src/index.ts`. Implementations may live in domain modules
under `firebase/functions/src/`; see `docs/FUNCTIONS_ARCHITECTURE.md`. Common
frontend wrappers live under `static/js/dashboard/`.

- `assignMachineTag`: assigns an existing Tag ID to a machine and updates access data.
- `generateMachineTagQr`: generates/stores a QR PNG and writes `tagQrUrl`, `tagQrPath`, `tagQrSize`, `qrUrl`, `qrPath`, and `qrSize` metadata.
- `disconnectMachineTag`: disconnects Tag ID data and deletes the associated QR file/path. Preserve this cleanup behavior.
- `setMachineQrAccessEnabled`: enables or suspends QR/NFC access while preserving the Tag ID, URL, and stored QR; disabling also revokes active machine-access sessions.
- `deleteMachine`: owner-only machine deletion. It removes the canonical and
  legacy machine documents plus associated Tags, access records, administrator
  links, invitations, transfer invitations, access sessions, dashboard
  placements, document files, and every associated Tag QR path.
  Do not restore direct client-side machine deletion.
- `setControlPanelUserCollaborator`: superadmin-only toggle for suggestion collaborators.
- `validateRegistrationCode`: checks an exact code without exposing the
  registration-code document to the browser.
- `redeemRegistrationCode`: authenticated, transactional registration. It
  creates the user profile without `regCode` and deletes the code in the same
  transaction, so two accounts cannot redeem it.
- `completeAccountOnboarding`: authenticated, first-login-only completion. It
  updates the profile and account directory, uses the optional company or the
  display name as the dashboard title, and creates at most 50 empty owned
  machine records. Repeated calls do not create duplicate machines.
- `createOwnedMachine`: authenticated owner-machine creation. It transactionally
  enforces the 64-owned-machine limit, with the control-panel `superadmin`
  exemption. The `provisionMachineTagOnCreate` Firestore trigger then assigns a
  generated Tag ID, creates `machine_access`, and stores the corresponding QR.
- `createGlobalAdminInvites`: authenticated owner bulk invitation for every
  currently owned machine. It resolves email or account handle once, skips
  accepted administrators and pending duplicates, and reports machines blocked
  by an ownership transfer. Future machines are intentionally not included.
- `transitionMachineStatus`: authenticated owner/accepted-admin transition.
  It atomically updates the canonical machine and its `machine_access`
  projection, creates/reuses/completes the restoration task, appends history,
  and writes the canonical lifecycle event. Client operation IDs make retries
  idempotent.
- `cleanupControlPanelLegacyRegistrationCodeLinks`: superadmin-only,
  idempotent removal of old `users.regCode` fields. It does not delete or
  disable accounts.
- `createDashboardSuggestion`: creates a suggestion for `superadmin` or an enabled collaborator.
- `listDashboardSuggestions`: lists own suggestions for collaborators and all suggestions for `superadmin`.
- `markDashboardSuggestionsSeen`: stores the superadmin suggestions seen timestamp.
- `listDashboardTodos`, `createDashboardTodo`, `updateDashboardTodo`,
  `deleteDashboardTodo`: manage private and shared dashboard Tasks. Shared
  participants may update completion state; deletion remains owner-only.
- `listDashboardTodoCollaborators`: returns enabled collaborators for the
  dashboard Tasks mention autocomplete; it is available only to Tasks users.
  Account handles
  are preferred, with the legacy email-local mention retained for accounts
  that have not claimed a handle.
- `checkAccountHandleAvailability`, `claimAccountHandle`,
  `changeAccountHandle`: validate, claim, and change public account handles.
  Changes are transactional, reserve every previous alias permanently for its
  owner, and write `account_handle_history`. Direct browser writes are forbidden.
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
- `getMachineAccessPublic`, `verifyMachineAccessUser`, and
  `updateMachineAccessOperational`: QR/machine access callables.
  `getMachineAccessPublic` is contextual: unauthenticated callers receive only
  name, brand/model, and plate; accepted owner/admin accounts receive the
  managed projection; valid local sessions receive only fields allowed by
  their `operator` or `technician` role. Operational updates enforce status
  and task capabilities in the backend instead of relying on hidden UI
  controls. Assigned machine tasks are filtered by the stable local-user ID
  (with normalized username fallback for legacy data); unassigned tasks remain
  visible to every authorized local user. Local writes merge only the caller's
  visible subset, preserving tasks assigned to other users. They can enforce
  Firebase App Check when Functions are deployed with
  `ENFORCE_APP_CHECK=true`.
- `uploadMachineAccessDocument`: raw document-upload endpoint for valid
  short-lived machine-local sessions. It revalidates the current role
  capabilities, file signature, MIME type, size, owner path, task linkage, and
  account storage quota before updating canonical `machines.documents`
  metadata. Storage rules remain closed to direct local-PIN writes.
- `cleanupMachineAccessSessions`: scheduled cleanup for expired
  `machine_access_sessions` documents. Expired sessions are also deleted on use.
- `refreshPublicNfcLandingStats`: scheduled six-hour refresh of the aggregate
  `public_metrics/nfc` document. It never publishes machine, account, Tag ID,
  incident, task, or integrity details.
- `getPublicNfcLandingStats`: public, no-input callable used only when the
  aggregate does not exist yet. It creates that aggregate once and returns the
  same three counts, so a newly deployed landing does not wait for its first
  scheduled refresh. It follows the existing optional App Check enforcement.
- `submitLaundrySpareRequest`: public, rate-limited spare-part request. It
  validates image signatures and required fields before sending an idempotent
  internal notification. Once that internal message is accepted, a failed
  customer confirmation is logged but does not report the already-received
  request as failed.
- `deliverEmailOutbox`: private Firestore trigger for `email_outbox`. Account
  flows enqueue event-addressed messages from server code; the trigger renders
  repository-owned bilingual templates and sends
  them through Resend with an idempotency key. Browser access to the outbox is
  denied. Welcome, verification, password reset, administrator invitation and
  ownership-transfer events are connected.
- `flushAdminInviteEmailBatches`: minutely scheduled worker that atomically
  closes due administrator-invitation batches and queues one idempotent email.
  The message remains informational and links to the dashboard; invitation
  acceptance continues inside the authenticated app.
- `notifyMachineStatusTransition`: existing private `machines` update trigger.
  It follows `lastStatusEventId` to consume the canonical event instead of
  reinterpreting status fields. It can create one event-addressed outbox record
  for the owner and one for each accepted administrator. Owner delivery follows
  the owner's personal scope; administrator delivery requires both the owner's
  `notifyAdministrators` permission and the administrator's
  `receiveAdministeredMachines` opt-in. It never sends for `desconectada` or
  generic status changes.
- `listControlPanelEmailTemplates`: superadmin-only catalogue of the account,
  security, access, invitation, and transfer templates. It returns ES/EN sample
  renders from the same versioned renderer used for delivery; it does not expose
  secrets or send messages. Its status comes from the authoritative template
  catalogue, not from browser-maintained metadata.
- `listControlPanelEmailDeliveries`: superadmin-only delivery totals and recent
  outbox status. It masks recipient addresses and does not return template
  data, action URLs or provider idempotency keys.
- `retryControlPanelEmailDelivery`: superadmin-only transactional retry for a
  failed outbox record. It creates one pending successor with the same
  idempotency key and marks the source record to prevent duplicate manual
  retries.
- `requestAccountPasswordReset`: public neutral-response callable. It rate
  limits by a SHA-256 email key, generates Firebase's signed reset link only for
  an existing account, and queues the branded Resend email without revealing
  whether the account exists.
- `requestAccountAccess`: rejects an email already present in Authentication;
  no request or registration code is created for an existing account.
- Approved registration codes carry the normalized requested email. Validation
  also resolves legacy codes through `accessRequestId`, and redemption requires
  the authenticated account email to match the approved address.
- `changeAccountPassword`: authenticated account callable requiring an
  `auth_time` within five minutes. It updates Auth server-side and queues the
  password-change confirmation without storing the submitted password.
- `requestAccountEmailChange`: recently reauthenticated callable that stores a
  one-hour pending request and queues Firebase's verify-before-update link to
  the new address.
- `finalizeAccountEmailChange`: authenticated idempotent finalizer. It acts only
  after Admin Auth reports the requested new address, migrates the account
  directory mapping and queues the completed-change notice to the old address.

## Integrity Cleanup Log

Production cleanup details, backup manifest names, Tag IDs, and machine names
must not be committed to the public repository. Keep specific cleanup notes in
local private notes or encrypted operational records. Public documentation
should describe only the cleanup policy and the data relationships that must be
preserved.

## Tag ID And QR Rules

- Creating or connecting a Tag ID should result in a QR automatically.
- Every newly created canonical machine is automatically provisioned with one
  generated Tag ID, its localized access URL, `machine_access`, and a stored QR.
  Provisioning is backend-owned and idempotent so retries cannot allocate a
  second Tag ID to the same machine.
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

## Access And Roles Direction

Long-term QR/NFC access and global role management are tracked in
`docs/ACCESS_ROLES_MODEL.md`. The current `machines.users[]` plus `usernames`
model is transitional. Future work should separate local operator identity from
machine assignment, and should treat public QR/NFC scans as a limited gateway
rather than authorization to operational machine data.

## Production Safety

One-off Firebase maintenance scripts should be temporary. If a script is created to transfer ownership, inspect accounts, or modify production data, remove it once the operation is complete unless the user explicitly asks to keep it.

Storage rules live in `firebase/storage.rules` and are referenced by `firebase.json`.
