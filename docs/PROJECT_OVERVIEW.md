# Project Overview

Unatomo is an operational layer for physical machines.

The core idea is simple: every relevant machine can have a digital context that
survives beyond memory, chats, loose photos, and isolated service notes. A QR or
NFC tag opens the machine page, and the app keeps the useful context around that
machine in one place.

## What The Product Does

Unatomo currently supports:

- Machine records with status, identity, location, and owner/admin context.
- QR/NFC access paths for machine pages.
- Machine history and global registry views.
- Tasks, notes, and status-linked restore work.
- Machine documents and Storage-backed files.
- Tag ID creation, assignment, QR generation, and cleanup.
- Dashboard grouping, ordering, search, and responsive machine cards.
- Account handles, invitations, administrator links, and transfer flows.
- Owner-only control panel views for system status, integrity checks, backups,
  users, registration codes, and generated Tag IDs.

## Product Position

Unatomo is not intended to be a generic chat app or a generic asset database.
Its strongest current direction is machine-centered operations: the machine is
the anchor, and the surrounding people, process, history, tasks, and decisions
are the context.

The app is already oriented around real operational use in industrial laundry
and machine-service environments. It should stay practical, clear, and careful
with production data.

## Main User Flows

1. A machine is registered in the dashboard.
2. A Tag ID and QR/NFC access path are created.
3. The QR/NFC tag is placed on or near the physical machine.
4. A user opens the machine page from the tag.
5. The dashboard keeps the machine's status, tasks, history, users, documents,
   and administrative relationships up to date.

## Roles And Access

- Machine owners control their machines and related data.
- Administrators can be linked to machines through explicit admin flows.
- Users interact with permitted machine pages and dashboard areas.
- `superadmin` refers to project-owner-only UI and maps to the existing control
  panel access check in code.

Firebase Auth `uid` remains the canonical durable identity for account
relationships.

## Technical Shape

- Static frontend served from the repository build output.
- Vanilla JavaScript modules for dashboard and page behavior.
- Firebase Auth, Firestore, Storage, and callable Functions.
- GitHub Pages workflow for static hosting.
- Firebase CLI wrappers for rules, functions, and backend deployment.

See [REPO_MAP.md](REPO_MAP.md) for the source layout.
