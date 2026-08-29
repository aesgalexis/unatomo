# Laundry Services Architecture

## Scope

`laundryservices/` is a static, localized public site with two Firebase-backed
product surfaces: used machinery and spare-part requests. Public editorial copy
lives in physical HTML pages under `es/`, `en/`, `it/` and `el/`; JavaScript is
reserved for interaction and Firebase data. Operational catalogue records must
not be embedded in public JavaScript or JSON.

## Frontend Boundaries

- Localized routes: `/{language}/{translated-slug}/index.html`. Each page has
  static localized navigation, content, canonical metadata, reciprocal
  `hreflang` links and structured data. Language selection is normal navigation.
- Shared shell behavior: `ls_top-bar.js`, `ls_page.js` and `ls_footer.js` only
  control visibility, menus and disclosure. They do not inject or translate copy.
- Legacy unlocalized URLs are small `noindex` compatibility redirects to the
  equivalent Spanish route. `/laundryservices/catalogo/` remains a private,
  Spanish-only administration surface.
- Used machinery:
  - `ls_maquinaria.js`: public filtering, pagination and rendering.
  - `ls_maquinaria/agregador/ls_machine-public-store.js`: read-only public
    subscription. It does not import Authentication, Storage or write APIs.
  - Each localized machinery HTML page contains one small JSON configuration
    block for labels used while rendering live Firestore records.
  - `ls_maquinaria/agregador/ls_machine-store.js`: Firestore and Storage
    persistence.
  - `ls_maquinaria/agregador/ls_machine-add.js`: privileged editor UI.
    It is loaded only when an authenticated maintainer opens a machinery route
    with `?admin=1`; ordinary visitors do not download the admin bundle.
- Spare-part requests:
  - `recambios/recambios.js`: wizard state, validation and submission.
  - Each localized spare-parts HTML page contains one small JSON configuration
    block for dynamic form status and catalogue labels.
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
privileged UI. Editors can unpublish records and remove images. Storage cleanup
is allowed only for the `laundryServicesAdmin` claim, and failed metadata writes
compensate by removing newly uploaded objects. The old browser-side automatic
seed has been removed: opening a public page must never recreate operational
data.

## Guardrails

Run `npm run test:laundry`. The checks reject public catalogue files, legacy
client-side translation modules and missing localized-route SEO relationships;
they also cap executable Laundry Services modules at 500 lines and 22 KB.

The static build concatenates the split Laundry Services stylesheets into the
published `ls_styles.css` and excludes the repository-only legacy machinery
image archive. Source files remain split for maintenance and local development.

Publishing, Firestore rule deployment and catalogue synchronization remain
owner-run production operations.
