# Dashboard CSS Architecture

Updated: 2026-06-23

## Entry Point

`static/css/dashboard.css` is the stable stylesheet entry point used by the
Spanish and English dashboard and machine-access pages. It is an import-only
manifest; keep its import order stable because later files preserve the
original cascade of the former monolithic stylesheet.

## Source Files

- `dashboard/shell.css`: dashboard shell, search, primary controls, and view
  menu.
- `dashboard/incident-modal.css`: out-of-service incident modal.
- `dashboard/registry.css`: global registry view.
- `dashboard/gallery.css`: gallery view.
- `dashboard/suggestions.css`: suggestions view.
- `dashboard/todo.css`: To Do view and its narrow-screen rules.
- `dashboard/loading.css`: loading, bootstrap, invitation, and placeholder UI.
- `dashboard/group-tree.css`: side-tree layout, group actions, visibility
  controls, status badges, and drag/drop states.
- `dashboard/machine-base.css`: machine-card base, tabs, history, and groups.
- `dashboard/machine-documents.css`: plate/manual/other document UI.
- `dashboard/machine-config.css`: logs, destructive controls, users, Tag ID,
  QR, administrators, transfers, and notifications.
- `dashboard/machine-tasks.css`: tasks, notes, attachments, and task forms.
- `dashboard/machine-login.css`: operational machine login overlay.
- `dashboard/responsive.css`: final cross-feature mobile overrides.

`static/css/configuracion.css` remains separate because it belongs to account
settings, not machine-card configuration.

## Rules

1. Do not move an import without reviewing cascade impact.
2. Keep feature selectors in their owning file; place only genuinely
   cross-feature mobile overrides in `responsive.css`.
3. Structural extraction must not rename selectors, combine declarations, or
   change values in the same change.
4. Run `npm.cmd run check:nfc:architecture` after any manifest or file move.
5. Test the dashboard and `/nfc/{lang}/m.html` because both consume the stable
   `dashboard.css` entry point.
6. Keep controls visually consistent with established site components whenever
   possible. Buttons should inherit the site's normal font weight by default;
   use semantic color to communicate state instead of bespoke bold typography,
   and reuse shared action labels for equivalent actions.

## Migration Record

### 2026-06-23

- Split the 3,800 physical lines of `dashboard.css` into 12 ordered source
  files.
- Preserved every original line and its global cascade position exactly.
- Replaced `dashboard.css` with the ordered import manifest.
- Added architecture checks for required files, canonical import order, an
  import-only entry point, and successful CSS graph bundling.
