# Laundry Services Architecture

## Scope

`laundryservices/` is a static, localized public site with two Firebase-backed
product surfaces: used machinery and spare-part requests. Public page copy may
live in HTML or dedicated localization modules. Operational catalogue records
must not be embedded in public JavaScript or JSON.

## Frontend Boundaries

- Shared shell: `ls_top-bar.js`, `ls_page.js`, `ls_footer.js`,
  `ls_upperfooter.js`, and `ls_claim-loop.js`.
- Editorial pages: page HTML plus data-only modules under `i18n/`. Large
  translation dictionaries are content stores, not executable monoliths.
- Used machinery:
  - `ls_maquinaria.js`: public filtering, pagination and rendering.
  - `i18n/machinery.js`: localized labels and metadata only.
  - `ls_maquinaria/agregador/ls_machine-store.js`: Firestore and Storage
    persistence.
  - `ls_maquinaria/agregador/ls_machine-add.js`: privileged editor UI.
- Spare-part requests:
  - `recambios/recambios.js`: wizard state, validation and submission.
  - `i18n/spare-parts.js`: localized copy only.
  - `recambios/catalog-schema.js`: catalogue validation shared by the admin
    editor and its repository.
  - `recambios/catalog-repo.js`: Firestore catalogue reads and partitioned
    admin publication.
  - `recambios/image-upload.js`: image validation and preparation.
  - The callable Function is split into request validation, rate limiting,
    email templates, Resend delivery and a thin public orchestrator under
    `firebase/functions/src/laundry/`.
- Catalogue administration:
  - `catalogo/catalog-admin.js`: authentication, claim checks and editor state.
  - `catalogo/catalog-admin.css`: isolated private-editor presentation.
  - The page is `noindex`; Firestore rules, not page visibility, enforce writes.

`ls_styles.css` is a stable import manifest. Shared CSS is divided by concern
under `styles/`; isolated features use page-specific stylesheets such as
`recambios/recambios.css` and `catalogo/catalog-admin.css`.

## Catalogue Data

The runtime source of truth is `laundry_public_catalog` in Firestore. It is
partitioned into `meta`, `categories` and one `manufacturer_{id}` document per
manufacturer so model and spare-part growth does not create one large document.
Together these documents hold:

- `categories`: localized machine categories;
- `manufacturers`: canonical manufacturers, aliases and sub-brands;
- `models`: model groups linked by `manufacturerId` and `categoryId`;
- `spareParts`: optional spare-part records for future structured selection;
- publication metadata (`version`, `updatedAt`, `publishedAt`, `publishedBy`).

The public site may read this collection. Only a user with the
`laundryServicesAdmin` claim may create or update it, and deletion is denied.
The `meta.activeManufacturerIds` list prevents obsolete documents from being
shown without requiring destructive deletion. `firebase/catalog/laundry-public-catalog.json` is an
owner-run migration/recovery snapshot outside the public build, not a browser
fallback. Authorized maintainers use `/laundryservices/catalogo/`; each editor
publication validates references, increments the catalogue version and records
the authenticated Firebase UID.

Used-machinery listings are separate records in
`agregador_maquinaria_LS`. They are read from Firestore and edited through the
privileged UI. The old browser-side automatic seed has been removed: opening a
public page must never recreate operational data.

## Guardrails

Run `npm run test:laundry`. The check rejects public catalogue files and caps
executable Laundry Services modules at 500 lines and 22 KB. Data-only copy
modules are excluded because their size does not increase runtime coupling.

Publishing, Firestore rule deployment and catalogue synchronization remain
owner-run production operations.
