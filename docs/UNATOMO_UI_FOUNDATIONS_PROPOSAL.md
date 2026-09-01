# UNATOMO UI Foundations Proposal 01

Status: proposed for review  
Based on: `docs/UNATOMO_UI_CONTRACT.md`,
`docs/UNATOMO_UI_INVENTORY.md` and
`docs/UNATOMO_UI_FOUNDATIONS_INVENTORY.md`  
Runtime adoption: action color, contact submit/width and Core-dark theme

Review implementation: `dev/ui-showroom/`

## Decision Boundary

This packet proposes the first stable vocabulary for new UNATOMO work. It does
not make any item Canonical until it is reviewed and approved. Approval would
apply to new pages and products first; it would not authorize changing existing
pages or migrating NFC.

The goal is to approve low-risk foundations that already match substantial
parts of the site, while postponing expressive and high-risk decisions.

## Proposal Summary

| ID | Proposal | Recommendation |
| --- | --- | --- |
| P-01 | Use the `ut` namespace for public design-system tokens and components | Approve |
| P-02 | Adopt the existing system font stack | Approve |
| P-03 | Separate ordinary UI text from comfortable body and display text | Approve model; review exact use |
| P-04 | Name a compact/standard/prominent control scale | Hold: inventory contexts before choosing values |
| P-05 | Define 18 px as the ordinary icon size | Approve |
| P-06 | Define 12 px as the ordinary control radius and retain pill as a shape | Approve |
| P-07 | Define a semantic subtle border with 1 px width | Approve |
| P-08 | Define a structural spacing scale and keep optical spacing internal | Approve model |
| P-09 | Name 600/800/876/1120 px container roles | Approve |
| P-10 | Define semantic color roles through product profiles | Action role and Core-dark theme adopted; defer other profiles |
| P-11 | Define four motion duration roles | Review after visual baseline |
| P-12 | Treat 768/769 as one conceptual responsive boundary | Approve concept; defer full breakpoint set |

## P-01 — Namespace

Recommended public prefix:

```text
--ut-...       CSS custom properties
.ut-...        CSS component classes
data-ut-...    behavior or profile attributes
```

`ut` is short enough for regular use and prevents collisions with generic
existing names such as `--bg`, `.field`, `.card` and `.icon-button`.

Existing classes and variables should not be renamed globally. Future adapters
may map existing local names to namespaced values after visual verification.

## P-02 and P-03 — Typography

Recommended default family:

```css
--ut-font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  Roboto, "Helvetica Neue", Arial, sans-serif;
```

Recommended first text roles:

```css
--ut-text-ui: 0.95rem;
--ut-text-body: 1rem;
```

`ui` is the ordinary control, form and application-copy role already dominant
across the repository. `body` is the more comfortable public/editorial role.
Products may choose which role is their page default without redefining the
roles themselves.

Compact labels, captions and metadata need a later typography packet. Current
values are close but not sufficiently converged to choose one scale without
checking dashboard wrapping.

Display typography remains profile-specific. Core, NFC landing, Laundry and
Studio may keep different hero sizes while sharing role names and font family.

## P-04 — Control Heights

The earlier 36/44/50 px proposal is not ready to become a default. The visual
inventory shows that these values describe particular contexts, not yet three
general roles:

- 32 px: NFC public topbar and dense controls;
- 36 px: Corporate, Laundry and Studio utility controls;
- 40 px: NFC dashboard actions, onboarding fields and the shared circular
  `Volver` / `Arriba` navigation;
- 42 px: NFC public landing actions;
- 44 px: the strongest converged contact-field height;
- 50 px: the NFC onboarding submit action, with no current evidence that it
  should become a site-wide `prominent` button.

NFC also contains text action pairs at two additional densities: compact
`Aceptar` / `Cancelar` controls with automatic height and modal actions with a
`2.35rem` minimum height. These are distinct workflow contexts and should be
recorded before deciding whether either maps to a public size role.

The next safe step is to give existing contexts internal descriptive aliases
that preserve their pixels exactly. A smaller public scale can be proposed only
after the aliases reveal which values are truly equivalent. Multiline controls,
checkboxes, switches and icon-only touch targets remain component-specific.

## P-05 to P-07 — Icon, Radius and Border

Recommended values:

```css
--ut-icon-size-standard: 1.125rem; /* 18px */
--ut-radius-control: 0.75rem;      /* 12px */
--ut-radius-pill: 999px;
--ut-border-width: 1px;
```

The control radius and icon size already converge across Corporate, Laundry,
Studio and substantial Core/NFC UI. Pill remains a semantic shape rather than
a larger numeric radius.

Card and panel radii are not included in this first approval. Current
`0.5rem`, `0.85rem` and `1rem` values represent several surface sizes that
should be reviewed with the card component.

The border proposal defines width and purpose, not color:

```css
border: var(--ut-border-width) solid var(--ut-color-border-subtle);
```

## P-08 — Structural Spacing

Recommended structural scale for new layout work:

```css
--ut-space-0: 0;
--ut-space-1: 0.25rem; /* 4px */
--ut-space-2: 0.5rem;  /* 8px */
--ut-space-3: 0.75rem; /* 12px */
--ut-space-4: 1rem;    /* 16px */
--ut-space-5: 1.25rem; /* 20px */
--ut-space-6: 1.5rem;  /* 24px */
--ut-space-8: 2rem;    /* 32px */
```

The skipped `7` is intentional only if numeric names represent quarter-rem
steps; a semantic naming alternative may be preferable before implementation.
The exact naming scheme remains open.

Values such as `0.35rem`, `0.45rem`, `0.55rem`, `0.65rem` and `0.85rem` are
frequent optical adjustments. They should not become general layout tokens by
default, but neither should they be rounded during migration. They can remain
inside component recipes or compatibility adapters.

The established contact grid gap of `1rem 1.5rem` already fits the structural
scale.

## P-09 — Container Roles

Recommended role names and current values:

```css
--ut-container-form: 37.5rem;      /* 600px */
--ut-container-content: 50rem;     /* 800px */
--ut-container-editorial: 54.75rem; /* 876px */
--ut-container-wide: 70rem;        /* 1120px */
```

These names describe purpose and avoid a universal container that fits no
surface well.

The unresolved contact-form question becomes explicit:

- ordinary/narrow contact recipe: `form` container;
- wide/two-column contact recipe: `content` container.

This permits one shared form anatomy with two documented layout variants.
Corporate/NFC can retain the narrow recipe; Laundry/Studio can retain the wide
recipe until a later product decision. Standardization does not require making
them visually identical immediately.

## P-10 — Semantic Color Roles

Recommended first role vocabulary:

```css
--ut-color-canvas
--ut-color-surface
--ut-color-surface-elevated
--ut-color-text
--ut-color-text-muted
--ut-color-border-subtle
--ut-color-border-strong
--ut-color-action
--ut-color-action-hover
--ut-color-success
--ut-color-warning
--ut-color-danger
--ut-color-focus
```

The first approved raw role is shared across profiles:

```css
--ut-action-primary: #2da44e;
--ut-action-primary-hover: #2c974b;
--ut-action-primary-active: #26863f;
```

Core light, Core dark, Laundry light and Studio use these same values for
existing green actions. NFC consumes the same action role while retaining
separate non-interactive operational success/status colors.

Core dark and Studio additionally share the full semantic theme defined in
`static/css/themes/unatomo-core-dark.css`. Studio remains a distinct product
composition, not a separate color palette.

Current names such as `--bg`, `--fg` and `--border-subtle` should remain in
place until a surface is deliberately adapted. Violet `#7c3aed` remains
reserved for superadmin-only signals and is not a general action role.

## P-11 — Motion Roles

Candidate duration model:

```css
--ut-motion-immediate: 120ms;
--ut-motion-fast: 160ms;
--ut-motion-standard: 220ms;
--ut-motion-large: 320ms;
--ut-ease-standard: ease;
--ut-ease-emphasized: cubic-bezier(0.22, 1, 0.36, 1);
```

This model fits the strongest repository clusters but should remain Proposed
until representative interactions are recorded or visually compared. Existing
140, 180, 240, 260, 280 and 340 ms transitions should not be rewritten merely
to fit the scale.

The same review must define the reduced-motion behavior attached to every
motion role.

## P-12 — Responsive Vocabulary

The 768/769 pair should be treated as one conceptual boundary, tentatively
named `compact-layout-end`, while retaining exact max/min query semantics.

The full breakpoint set is deferred. Values such as 480, 560, 600, 640, 900
and 1280 px serve real but different shell and component needs. New components
should prefer intrinsic wrapping or container-aware behavior where practical,
but existing media queries remain untouched.

## Explicitly Deferred

This packet does not choose:

- compact label and metadata typography;
- heading/display scales;
- card and modal geometry;
- public control-height values and whether a `prominent` role is needed;
- raw theme colors beyond the adopted primary-action role and Core-dark theme;
- shadows and z-index numbers;
- widths for form families other than the adopted 600 px contact container;
- a component implementation or package structure;
- any migration target;
- any NFC geometry, typography or density modification.

## Effect of Approval

If approved, the selected proposals become Canonical defaults for new work and
for the future isolated design-system prototype. Existing pages remain
Observed/Legacy-compatible and visually unchanged.

The proposal now has an unconsumed token prototype and static current-state
showroom at `dev/ui-showroom/`. It remains outside production entry points and
exists so observed components, vocabulary and later proposals can be compared
before approval.
