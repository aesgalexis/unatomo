# Repository Map

This map is the quick human entry point. Deeper operating notes live in the
feature-specific docs.

For the larger model documents, inspect their headings first and read the
relevant sections instead of loading the complete file by default.

## Root

- `README.md`: concise public entry point and documentation links.
- `package.json`: scripts, metadata, and Node/npm version hints.
- `firebase.json`: Firebase Hosting/Firestore/Storage/Functions configuration.
- `.env.example`: template for local Firebase web config.
- `AGENTS.md`: operating instructions for coding agents.

## Product And Pages

- `index.html`: public root page.
- `landing/`: public landing pages and landing-specific scripts/styles.
- `es/`, `en/`, `it/` and `el/`: physical localized homepage, about, contact,
  and privacy pages with translated slugs and reciprocal SEO metadata.
  Existing direct utility routes such as `es/m.html` and `en/m.html` remain
  alongside them; legacy `landing/` URLs are compatibility redirects.
- `nfc/es/` and `nfc/en/`: localized NFC/dashboard/auth/static pages,
  including account settings and the global access page.
- `laundryservices/{es,en,it,el}/`: physical localized Laundry Services pages
  with translated slugs; shared JavaScript provides behavior, not page copy.
- `studio/{es,en,it,el}/`: physical localized UNATOMO Studio pages; shared CSS
  and JavaScript provide the visual shell and behavior, while copy and SEO stay
  in each localized HTML page.
- `nfc/controlpanel/`: owner-only control panel UI. `panel.js` is the small
  entry/composition layer; `panelText.js`, `panelShared.js`,
  `panelSystemIntegrity.js`, `panelStatsBackup.js`, `panelLocalCards.js`,
  `panelUsers.js`, `panelCodes.js`, `panelTags.js`, and `panelCallables.js`
  `panelEmailTemplates.js` contain the localized text, shared primitives, card
  renderers, transactional-email previews, and callable wrappers by
  responsibility.

## Frontend Source

- `dev/ui-showroom/`: isolated, noindex UI-foundations showroom. It is not
  linked from production pages and is excluded from the static production build.
- `static/js/dashboard/`: dashboard bootstrap, runtime, rendering, data,
  machine cards, hooks, views, and tabs.
- `static/js/firebase/`: shared Firebase app/App Check initialization, the
  read-only public Firestore entry, and the full authenticated client facade.
- `static/js/qr-print/`: QR print page logic.
- `static/js/registro/`: registration, login, reset, and session menu logic.
- `nfc/controlpanel/panelAccessRequests.js`: superadmin review of public access
  requests, including approval and rejection actions.
- `static/js/site/`: locale and site-level preferences.
- `static/css/dashboard.css`: dashboard stylesheet manifest.
- `static/css/dashboard/`: split dashboard styles by feature.
- `static/css/themes/unatomo-core-dark.css`: shared semantic dark palette used
  by Core dark and Studio without coupling their layouts.
- `static/css/qr-print.css`: QR print layout and print CSS.

## Firebase

- `firebase/firestore.rules`: Firestore security rules.
- `firebase/storage.rules`: Storage security rules.
- `firebase/firestore.indexes.json`: Firestore indexes.
- `firebase/functions/src/`: callable Functions source split by domain.

Read [FIREBASE_MODEL.md](FIREBASE_MODEL.md) before changing ownership, admin
links, Tag ID, QR cleanup, callable Functions, or data permissions.

## Scripts

- `scripts/build-static.mjs`: static build output to `dist/`; it does not
  regenerate tracked code statistics.
- `scripts/generate-code-stats.mjs`: explicitly refreshes
  `static/data/code-stats.json`.
- `scripts/generate-config.mjs`: generates runtime Firebase config.
- `scripts/dev-server.mjs`: simple static development server.
- `scripts/site-publish.mjs`: owner-run publish helper.
- `scripts/firebase-clean.mjs`: Firebase CLI wrapper used by deploy scripts.
- `scripts/scan-secrets.mjs`: local secret scan.
- `scripts/check-nfc-architecture.mjs`: dashboard architecture guard.
- `scripts/backup-*-nfc.mjs`: owner-run/read-only NFC backup helpers.

## Documentation Routing

- `docs/NOTIFICATIONS.md`: transactional email, Resend, template integration,
  notification policy, current status, and continuation plan.

- `docs/CHATGPT_CODEX_HANDOFF.md`: guide for turning owner conversations into
  grounded, actionable implementation prompts for Codex.
- `docs/SUBAGENTS.md`: optional delegation playbook; read only when delegation
  is explicitly requested or clearly justified.
- `docs/PROJECT_OVERVIEW.md`: what the product does and why it exists.
- `docs/UNATOMO_UI_CONTRACT.md`: evolving cross-product visual foundations,
  component contracts, safety boundaries, and standardization roadmap.
- `docs/UNATOMO_UI_INVENTORY.md`: documentary measurements and comparison
  matrix for current cross-product UI patterns; it has no runtime effect.
- `docs/UNATOMO_UI_FOUNDATIONS_INVENTORY.md`: typography, spacing, geometry,
  responsive, color, elevation, motion, and focus inventory for the UI contract.
- `docs/UNATOMO_UI_FOUNDATIONS_PROPOSAL.md`: first review packet for namespaced
  tokens, control sizes, containers, spacing, colors, motion, and responsive roles.
- `docs/LAUNDRY_SERVICES_ARCHITECTURE.md`: Laundry Services module boundaries,
  Firestore catalogue ownership, and monolith guardrails.
- `docs/DEV.md`: authoritative local setup and development commands.
- `docs/DASHBOARD_MODEL.md`: dashboard, cards, Tag ID, QR print, menu, and i18n.
- `docs/FIREBASE_MODEL.md`: Firebase data flows and permission model.
- `docs/ACCESS_ROLES_MODEL.md`: QR/NFC access, global users, roles, and staged role-model migration.
- `docs/FUNCTIONS_ARCHITECTURE.md`: callable Functions structure.
- `docs/DEPLOY_NOTES.md`: publish/deploy policy and commands.
- `docs/WHATS_NEW_POLICY.md`: public What's New/Novedades policy.
