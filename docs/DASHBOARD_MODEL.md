# Dashboard Model

## Entry Points

- `static/js/dashboard/index.js`: dashboard bootstrap, auth handling, machine loading, draft state, hooks passed into machine cards, auto-save, and Firebase client operations.
- `static/js/dashboard/machineCardTemplate.js`: card creation entry.
- `static/js/dashboard/tabs/`: individual tab renderers.
- `static/js/dashboard/tabs/configuracion/`: configuration tab modules.
- `static/js/dashboard/i18n.js`: dashboard copy for Spanish and English.

## Machine Config

The configuration tab is split into modules. Tag ID and QR UI live in:

- `static/js/dashboard/tabs/configuracion/tag.js`

Tag-related backend/client wrappers:

- `static/js/tokens/tagTokens.js`: creates Tag IDs.
- `static/js/dashboard/tagRepo.js`: validates/assigns tags.
- `static/js/dashboard/tags/tagAssetsRepo.js`: builds Tag URLs, generates QR, disconnects tags.
- `static/js/dashboard/machineAccessRepo.js`: syncs machine access data.

## General Tab Documents

Machine documentation UI lives in:

- `static/js/dashboard/tabs/general/general.js`
- `static/js/dashboard/documents/machineDocumentsRepo.js`

Current implemented scope:

- `Plate` / `Placa`: accepts JPG, PNG, and WebP images.
- `Manual`: accepts PDF files up to 25 MB.
- Plate images are compressed/resized in the browser before upload.
- Uploads the image to Firebase Storage, not to the repository.
- Stores metadata in `machines.documents.<kind>`.

Other documentation may appear in the UI, but persistent upload support should be treated as a separate feature.

## Dashboard Groups

Groups are a user dashboard layout preference, not machine data. The layout is stored in Firestore at:

```text
dashboard_layout/{uid}
```

Current scope:

- Create groups by dragging one machine card onto the center of another card.
- Render group headers as collapsible sections.
- Move a machine into an existing group by dropping it onto a card in that group.
- Create one-level subgroups by dragging a group header onto another group.
- Reorder machines with drag and drop in the flat list, ungrouped list, and group bodies.
- The dashboard intentionally has no group creation button or per-card group selector.
- Group records may include `parentGroupId`; nesting deeper than one sublevel is intentionally flattened.

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

## Localization

When adding pages or menu links, update both Spanish and English where applicable:

- `nfc/es/...`
- `nfc/en/...`
- `static/js/site/locale.js`
- `static/js/registro/session-menu.js`
- Relevant i18n file, often `static/js/dashboard/i18n.js`.
