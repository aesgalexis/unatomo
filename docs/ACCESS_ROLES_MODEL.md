# Access And Roles Model

This document tracks the long-term design for QR/NFC access, roles, and user
management in the Unatomo NFC app. It is intentionally a living document: the
feature is central enough that implementation will happen in stages.

## Problem

QR and NFC tags are physically public. Anyone near a machine can scan the tag,
so the tag itself must not be treated as authorization. It is only an entry
point into a controlled access flow.

The current system mixes three identity layers:

- Firebase account users, keyed by Auth `uid`.
- Machine administrators and owners, keyed by account `uid`.
- Machine-local users stored in `machines.users[]`, identified by username and
  PIN.

This works for controlled tests, but it does not scale cleanly when many QR
tags, users, machines, and roles exist across one account.

## Product Direction

The QR/NFC flow should be:

```text
public QR/NFC scan -> limited public machine gateway -> identity -> permissions -> actions
```

not:

```text
public QR/NFC scan -> full machine access
```

The public gateway can identify the machine enough for the user to know where
they are, but operational data should require authorization.

## Identity Layers

### Account Users

Firebase Auth `uid` remains the durable identity for:

- Machine ownership.
- Accepted administrator access.
- Future account-level machine memberships.
- Storage ownership.
- Audit metadata.

Account handles and email addresses are lookup/display fields. They must resolve
to a `uid` before being persisted as permission keys.

### Local Operator Users

Local operator users exist for practical machine-floor access where a full
Unatomo account is not always appropriate. They should belong conceptually to an
owner account, then be assigned to machines.

Current storage:

```text
machines/{machineId}.users[]
usernames/{ownerUid_normalizedUsername}
```

Future storage should separate identity from assignment:

```text
operator_users/{ownerUid_operatorId}
  ownerUid
  username
  normalizedUsername
  displayName
  saltBase64
  passwordHashBase64
  active
  createdAt
  updatedAt

operator_assignments/{machineId_operatorId}
  machineId
  ownerUid
  operatorId
  role
  active
  createdAt
  updatedAt
  updatedBy
```

This enables one global operator to have different roles on different machines
without duplicating credentials.

### Machine Memberships

For real Unatomo accounts that are neither owner nor accepted administrator, use
a separate account membership relation:

```text
machine_memberships/{machineId_uid}
  machineId
  ownerUid
  uid
  role
  status: active | invited | disabled
  grantedByUid
  createdAt
  updatedAt
```

This should not replace owner/admin flows immediately. It is the future bridge
for account-based roles below full administrator rights.

## Public QR/NFC Gateway

Unauthenticated QR access should return only public gateway data:

- Machine display name or safe public code.
- Basic status only if explicitly accepted as public.
- Available access methods.
- Login prompts for Unatomo account or local operator/PIN.

Operational data should not be public by default:

- Tasks.
- Logs/history.
- Documents.
- Configuration.
- User lists.

Current note: `getMachineAccessPublic` still returns `logs` and `tasks` from
`machine_access`. That should be reduced before QR use becomes broad.

## Roles And Capabilities

Roles should be translated into capabilities. Code should ask whether a user can
perform an action, not scatter role-name checks through UI and callables.

Initial future role names:

- `manager`: manage configuration, QR/tag access, users, documents, tasks, and
  operational state.
- `operator`: work with operational tasks and machine state.
- `technician`: view technical context, history, documents, and tasks; edit only
  the operational areas explicitly allowed.
- `viewer`: read-only access to permitted machine information.
- `external`: restricted and usually temporary access.

Existing local roles during transition:

- `usuario`
- `tecnico`
- `externo`

The first implementation may keep these stored values while the UI and model
move toward capability-based handling.

## Global Access Management

The dashboard account access page is the global place to manage people and
access across an owner's machines.

Current first implementation:

- `nfc/es/accesos.html` and `nfc/en/access.html` load
  `static/js/accesos/index.js`.
- The session user menu links to `Accesos` / `Access` with a key icon.
- The card reads owner machines first and administrator-linked machines after
  them. Admin links are treated like the live dashboard listener: links marked
  `left` or `rejected` are ignored, and each linked machine is loaded
  independently so one failed read does not hide the rest.
- It groups current `machines.users[]` entries by normalized username across
  those visible machines.
- It avoids horizontal scrolling across users. Users are shown in a persistent
  selector list; the selected user stays in focus until another user is chosen.
- The focused user editor exposes prototype role, PIN, `All` / `Todas`, and
  per-machine access controls. Owner machines appear first, followed by
  administered machines.
- It includes prototype controls for creating a local user, changing PIN, and
  changing the displayed role.
- When a machine named `test machine` or `test machine 2` exists, the UI adds
  prototype users across the planned role set (`manager`, operator displayed
  from the legacy `usuario` value, `technician`, `viewer`, `external`) and
  assigns them to those lab machines so the matrix can be evaluated with
  realistic density.
- Matrix, PIN, create-user, and future-role changes are visual only in this
  phase. They should not be treated as persisted permission changes.
- The same card has a second role-permissions tab with prototype capability
  checkboxes grouped into reading, operational changes, and administration.
  The `viewer` / `Solo lectura` profile is protected: its read capabilities
  are enabled and every data-changing capability is disabled and locked.
- This remains a transitional UI over `machines.users[]`; it is not the final
  `operator_users` / `operator_assignments` model.

The first version groups existing local machine users by normalized username and
shows:

- User.
- Type, initially local/PIN.
- Number of assigned machines.
- Roles currently used.
- Machine list.
- Bulk role change across current assignments.

Later versions should add:

- Search and filters.
- Assignment matrix by machine.
- Multi-machine assignment and removal.
- PIN rotation.
- Active/disabled state.
- Account invitation or conversion.
- Expiry for external users.
- Last access/audit metadata.

## Migration Strategy

Work in stages:

1. Document the access contract and role direction.
2. Add a global access overview in Settings using current `machines.users[]`.
3. Centralize role-to-capability logic for QR machine pages.
4. Limit public QR callable output to safe gateway data.
5. Add backend callables for global local-user management.
6. Introduce `operator_users` and `operator_assignments`.
7. Migrate current `machines.users[]` users into the new collections.
8. Keep compatibility reads until old clients are no longer relevant.

Direct browser writes are acceptable only for the current transitional model.
The long-term global user management surface should use callables so role
changes, assignments, credential rotation, access sessions, and audit logs stay
consistent.

## Open Decisions

- Whether public QR gateway should show machine status before authentication.
- Whether local users should be owner-wide from day one in the new model, or
  tenant/account scoped with future organization support.
- Exact capability matrix for each future role.
- Whether accepted administrators can manage operator users for machines they
  administer, or only owners can manage global access.
- How much history/audit to expose for local operator actions.
- Expiry rules for external users and temporary access.
