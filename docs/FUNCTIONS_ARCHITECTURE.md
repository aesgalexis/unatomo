# Firebase Functions Architecture

Updated: 2026-06-23

## Purpose

The Functions backend has been split by domain from the original
`firebase/functions/src/index.ts` monolith. This was a structural migration:
public callable names, authorization rules, Firestore paths, Storage paths, and
response contracts must remain stable unless a separate feature change
explicitly requires otherwise.

## Current Structure

```text
firebase/functions/src/
├── index.ts
├── accounts/
│   └── handles.ts
├── controlPanel/
│   ├── deleteUser.ts
│   ├── registrationCodes.ts
│   └── systemAndUsers.ts
├── core/
│   ├── accountHandles.ts
│   ├── auth.ts
│   ├── codes.ts
│   ├── firebase.ts
│   ├── storage.ts
│   └── storageQuota.ts
├── dashboard/
│   ├── layout.ts
│   ├── suggestions.ts
│   └── todos.ts
└── machines/
    ├── access.ts
    ├── adminInvites.ts
    ├── tags.ts
    └── transfers.ts
```

- `index.ts` is an export-only public Functions entry point. Callables must be
  re-exported from this file under their existing names.
- `core/firebase.ts` is the single initialization boundary for Firebase Admin,
  global Functions options, Firestore, Storage, and shared collection refs.
- `core/auth.ts` owns shared email normalization and the existing control-panel
  user authorization check.
- Domain modules own callable implementations and feature-specific helpers.
- `core/storage.ts` owns shared Storage copy/delete primitives, while
  `core/storageQuota.ts` owns the account quota calculation.

## Intended Domain Boundaries

```text
accounts/       account handles and account identity operations
controlPanel/   superadmin users, status, registration codes, and tag inventory
dashboard/      layout, suggestions, and To Do
machines/       administrator links/invites, ownership transfers, and Tag ID/QR
core/           Firebase initialization and genuinely cross-domain primitives
```

Feature-specific helpers should move with their domain. Do not turn `core/`
into a general dumping ground and do not import from one feature domain merely
to reuse a private helper; promote only stable, cross-domain dependencies.

## Migration Rules

1. Preserve every export name from `lib/index.js`; Firebase uses these names as
   deployed function identities.
2. Keep `admin.initializeApp()` and `setGlobalOptions()` centralized in
   `core/firebase.ts`.
3. Avoid circular imports. Domain modules may depend on `core`, while `core`
   must not depend on domain modules.
4. Move behavior without rewriting it in the same step. Behavioral cleanup and
   structural extraction should be separate diffs.
5. Move low-risk domains before ownership transfers, administrator access, and
   Tag ID/QR cleanup flows.
6. Do not deploy as part of a structural extraction unless deployment is
   explicitly requested.

## Validation

Run from `firebase/functions` after every extraction:

```powershell
npm.cmd run build
npm.cmd run lint
```

Also inspect the compiled exports in `lib/index.js` and confirm that the public
callable list is unchanged. Generated `lib/` files are validation output and
must not be used as source files.

## Migration Log

### 2026-06-23 — Phase 1

- Centralized Firebase Admin initialization, global options, Firestore,
  Storage, and shared collection refs in `core/firebase.ts`.
- Centralized control-panel authorization and email normalization in
  `core/auth.ts`.
- Moved `saveDashboardGroupLayout` to `dashboard/layout.ts` and re-exported it
  from `index.ts` under the same public name.
- Left suggestions and To Do together in `index.ts` for the next dashboard
  extraction because they share collaborator and identity dependencies.
- TypeScript build and ESLint pass with the same 34 public callable exports.

### 2026-06-23 — Phase 2

- Extracted Dashboard layout, suggestions, and To Do callables.
- Extracted account handles, control-panel status/users/registration codes,
  administrator invitations, ownership transfers, Tag ID/QR, and user cleanup.
- Promoted only genuinely shared handle, code, Storage, quota, Firebase, and
  machine-access helpers into `core/` or `machines/access.ts`.
- Reduced `index.ts` to the stable export-only boundary for all 34 callables.
- Added architecture checks that require the domain modules, reject callable
  implementations in `index.ts`, cap its size, and verify 34 unique exports.
