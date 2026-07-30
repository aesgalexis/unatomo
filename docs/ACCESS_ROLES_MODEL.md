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

`getMachineAccessPublic` now returns only machine name, brand/model, and plate
metadata to unauthenticated callers. Tasks, history, location, serial,
configuration, and users require an accepted account relationship or a valid
short-lived local machine session.

## Roles And Capabilities

Roles should be translated into capabilities. Code should ask whether a user can
perform an action, not scatter role-name checks through UI and callables.

The assignable local roles are deliberately limited:

- `operator`: execute existing work. Its default profile can complete or
  reopen tasks, add notes, and change machine status, but cannot create, edit,
  or delete task definitions.
- `technician`: includes the operator workflow and can create and edit task
  definitions, read history, and upload images and technical documents by
  default. It cannot delete task definitions or machine documents.

Machine tasks can be left unassigned or assigned to one local `operator` or
`technician`. Assigned tasks and their task-linked history are visible only to
that local identity; owners and accepted administrators always retain full
visibility and their existing management permissions. Assignment narrows
visibility, while the role capability profile still decides which actions the
assigned user may perform.

`manager`, `viewer`, and `external` are not assignable roles. Machine owners
and accepted administrators are authenticated account relationships, not
local PIN roles. Public access is a safe unauthenticated projection, not a
user identity. In the role-permission editor it is represented as a third
profile so its read projection can be configured consistently. Only
`view*` capabilities can be enabled for Public; every operational capability
is forced off by the backend.

Legacy `usuario` values normalize to `operator`; legacy `tecnico` values
normalize to `technician`. Other legacy local values normalize conservatively
to `operator` when they are next saved from the Access surface.

Capabilities remain editable for both local roles, but only within the read
and operational capability set. A local PIN role cannot be elevated to account
administration, ownership transfer, machine deletion, access management, or
Tag/QR management. The backend is authoritative; hidden UI is not permission
enforcement.

## Global Access Management

The dashboard account access page is the global place to manage people and
access across an owner's machines.

Current implementation:

- The dashboard exposes access management through `#/usuarios` and `#/users`.
  This dashboard-native view uses expandable person cards,
  dashboard search and add controls, context switching for owner/admin
  machines, an aggregate `All users` tree node, and a separate role panel.
- Machine configuration links open the dashboard `Usuarios` / `Users` view.
- The card reads owner machines first and administrator-linked machines after
  them. Admin links are treated like the live dashboard listener: links marked
  `left` or `rejected` are ignored, and each linked machine is loaded
  independently so one failed read does not hide the rest.
- It groups current `machines.users[]` entries by normalized username across
  those visible machines.
- It avoids horizontal scrolling across users. Users are shown in a persistent
  selector list; the selected user stays in focus until another user is chosen.
- The focused user editor exposes stable role, PIN, `All` / `Todas`, and
  per-machine access controls.
- New users created by the owner are assigned to all machines in that owner
  context by default. Users saved with `accessScope: "all"` are inherited by future
  machines created from that owner's dashboard.
- User, PIN, role, assignment, deletion, and role-capability changes are
  persisted through authenticated callable functions. The compatibility
  implementation mirrors credentials and assignments into `machines.users[]`
  and `usernames` after verifying ownership or every accepted per-machine
  administrator link in the requested context.
- Owners can delete a global local user. The operation atomically removes the
  user from every owner machine in the current context and deletes the
  corresponding `usernames` registry document.
- The machine configuration tab shows who has access and can assign an
  existing user or remove that machine assignment. Identity creation, PIN
  changes, and stable role changes belong to the global Users view.
- Accepted per-machine administrators can create local identities inside an
  administered owner context and edit role capabilities and assignments for
  the machines visible in that context. They can also remove local identities
  from that administered context regardless of who originally created them.
  They cannot affect machines outside their accepted administration scope.
- The permissions panel edits `operator`, `technician`, and the constrained
  public profile. Public can only enable supported read capabilities.
- This remains a compatibility UI over `machines.users[]`; it is not the final
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
- Last access/audit metadata.

## Migration Strategy

Work in stages:

1. Document the access contract and role direction.
2. Add a global access overview in Settings using current `machines.users[]`.
3. Centralize role-to-capability logic for QR machine pages. Implemented.
4. Limit public QR callable output to safe gateway data. Implemented.
5. Enforce operational capabilities in backend callables. Implemented for
   status, task definitions, completion, notes, and task images.
6. Add backend callables for normalized global local-user management.
   Implemented for save/create, assignment changes, deletion, and role
   capability policies.
7. Introduce `operator_users` and `operator_assignments`.
8. Migrate current `machines.users[]` users into the new collections.
9. Keep compatibility reads until old clients are no longer relevant.

Direct browser writes are acceptable only for the current transitional model.
The long-term global user management surface should use callables so role
changes, assignments, credential rotation, access sessions, and audit logs stay
consistent.

## Open Decisions

- Whether public QR gateway should show machine status before authentication.
- Whether local users should be owner-wide from day one in the new model, or
  tenant/account scoped with future organization support.
- Whether accepted administrators should eventually receive an explicit
  owner-wide administration grant rather than their current per-machine scope.
- How much history/audit to expose for local operator actions.
