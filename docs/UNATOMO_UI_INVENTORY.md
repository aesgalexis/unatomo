# UNATOMO UI Inventory

Status: draft 0.1  
Contract: `docs/UNATOMO_UI_CONTRACT.md`  
Current phase: inventory with bounded runtime adoptions
Runtime adoption: action color, contact submit/width and Core-dark theme

## Purpose and Method

This inventory records current UI measurements before any standardization
work. It is evidence for later decisions, not a specification that pages must
already satisfy.

Measurements below come from the tracked CSS and HTML source. They have not yet
been verified as computed browser styles at every viewport. Values in `rem`
are shown as authored; pixel equivalents assume the normal 16 px browser root
only when useful for comparison.

The maturity terms Observed, Candidate, Canonical, Exception and Legacy have
the meanings defined in the UI contract. Nothing in this draft is Canonical.

## Surface Families

| Family | Primary style entry | Current role |
| --- | --- | --- |
| Core/NFC base | `styles.css` | Shared public, authentication and NFC foundations |
| NFC public | `static/css/nfc-landing.css` | Public NFC landing and contact adaptations |
| NFC dashboard | `static/css/dashboard.css` | Dense operational application; protected surface |
| Corporate | `landing/ld_styles.css`, `landing/ld_about.css` | Public landing, about, contact and legal pages |
| Laundry Services | `laundryservices/ls_styles.css` | Public editorial and service pages |
| Studio | `styles.css`, `studio/studio.css` | Studio composition consuming the shared Core-dark theme |

Core dark and Studio now source their semantic palette from
`static/css/themes/unatomo-core-dark.css`. This aligns canvas, surfaces, text,
borders, accent, status colors and topbar treatment without changing Studio's
layout, typography, imagery or component geometry.

The source scan finds 14 active localized contact routes in the four main
families: four Corporate, four Laundry Services, four Studio and two NFC. The
broader form surface also includes NFC authentication and onboarding, the NFC
access-request flow and localized Laundry Services spare-parts forms. These are
separate use cases and should not be forced into a contact-form layout merely
because they contain fields.

## Contact Form Geometry

### Route families

| Family | Localized routes | Form class | Maximum outer width | Maximum form/card width |
| --- | ---: | --- | ---: | ---: |
| Corporate | 4 | `.contact-form` | 800 px | 600 px canonical |
| NFC contact | 2 | `.contact-form` | 800 px base shell | 600 px canonical |
| Laundry Services | 4 | `.contact-form` | 800 px | 600 px canonical |
| Studio | 4 | `.studio-contact-form` | 800 px | 600 px canonical |
| NFC dashboard support | ES/EN shared rendering | `.contact-form` | dashboard section | 600 px canonical |

Before migration, Corporate and NFC used a 600 px card while Laundry Services
and Studio allowed the card to use an 800 px container. The canonical
`.ut-contact-form-container` now gives all 16 contact experiences a 600 px
maximum while retaining their existing outer page shells.

### Shared field anatomy

| Property | Core/NFC | Corporate | Laundry Services | Studio | State |
| --- | --- | --- | --- | --- | --- |
| Input height | `2.75rem` | `2.75rem` | `2.75rem` | `2.75rem` | Observed strong convergence |
| Field padding | `0.65rem 0.8rem` | same | same | same | Candidate |
| Field radius | `0.75rem` | same | same | same | Candidate |
| Border | 1 px subtle | same | same | same | Candidate pattern |
| UI font size | `0.95rem` | same | same | inherited in Studio fields | Observed convergence |
| Textarea minimum | 160 px | 160 px | 160 px | 160 px | Candidate |
| Textarea line height | 1.5 | 1.5 | 1.5 | 1.5 | Candidate |
| Label size | `0.85rem` | `0.85rem` | `0.85rem` | `0.85rem` | Candidate |
| Label weight | 500 | 500 | 500 | 500 | Candidate |
| Checkbox size | `1rem` | `1rem` | `1rem` | `1rem` | Candidate |
| Checkbox radius | `0.2rem` | same | same | same | Candidate |

At a 16 px root, `2.75rem` is 44 px and `0.75rem` is 12 px. These are
especially strong candidates because they already agree across all four
contact families without requiring a visual change.

### Layout and behavior

| Property | Core/NFC, Corporate, Laundry | Studio | State |
| --- | --- | --- | --- |
| Desktop columns | `repeat(auto-fit, minmax(220px, 1fr))` | two equal columns | Observed difference |
| Grid gap | `1rem 1.5rem` | `1rem 1.5rem` | Candidate |
| Full-width field | grid column `1 / -1` | same | Candidate |
| Consent gap | `0.65rem` | `0.65rem` | Candidate |
| Consent type | `0.82rem`, weight 400, line height 1.45 | same | Candidate |
| Mobile field text | forced to 16 px in Core base | inherited Studio behavior | Needs browser audit |
| Textarea resize | vertical | vertical | Candidate |
| Submit alignment | `.ut-form-actions` | `.ut-form-actions` | Canonical and migrated |

The auto-fit and fixed two-column approaches may produce the same result at
common widths but are not equivalent. A canonical form grid should define the
intended responsive behavior, not merely select whichever declaration appears
most often.

## Single-line Textbox Inventory

Scope includes visible `text`, `email`, `password`, `tel`, `number` and
`search` inputs. Checkboxes, radios, ranges, file inputs, hidden honeypots,
selects and multiline textareas are outside this measurement. Per the current
review boundary, inputs inside NFC dashboard machine cards and the main
dashboard machine-search control are also excluded.

| Authored recipe | Current contexts | Before | Current state |
| --- | --- | ---: | --- |
| `.field` and Studio contact fields | Corporate, NFC and Laundry contact; NFC auth/access; dashboard support; Studio contact; LS machine admin | mostly 44 px | 40 px canonical |
| `.spares-input` | Four localized Laundry Services spare-parts flows | 48 px minimum | 40 px canonical for inputs; textarea unchanged |
| `.onboarding-field > input` | NFC onboarding in ES/EN | 40 px | 40 px canonical through token |
| `.profile-input` | NFC account/profile settings | 40 px minimum | 40 px canonical through token |
| Dashboard standard dialog/create controls | User creation, task modal and QR search | 40.8 px (`2.55rem`) | 40 px canonical for inputs |
| Simulator numeric inputs | Self-service laundry simulator | 32 px minimum on desktop | 40 px canonical at every viewport |
| Dashboard compact editing | User-card credentials and compact task controls outside machine cards | approximately 24–26 px | Exception retained |
| Content-driven controls | Control panel, public machine-access overlay and incident modal | approximately 34–40 px | 40 px canonical for inputs |

Eligible single-line textboxes now consume
`--ut-textbox-height: 2.5rem` from
`static/css/tokens/unatomo-control-sizes.css`. The approximately 26 px compact
recipe remains an explicit exception. Selects and multiline controls retain
their previous measurements for separate review.

## Native Select Inventory

Scope includes native `<select>` controls authored in HTML and constructed from
JavaScript. All controls inside NFC dashboard machine cards are deliberately
excluded, including their hidden role placeholders. The inventory counts
authoring points rather than simultaneous DOM nodes: one per-user role recipe
can render more than once at runtime.

| Authored recipe | Current contexts | Before | Current state |
| --- | --- | ---: | --- |
| Dashboard compact selects | User context/create/edit roles, gallery upload, and user-create modal | approximately 26 px | Exception retained |
| `.ls-filter-select` | Laundry used-machinery filters in four languages | 32 px | 40 px canonical |
| Control-panel role | NFC control-panel agent role | 40 px | 40 px canonical through token |
| Global task modal | Dashboard global task creation | approximately 41 px | 40 px canonical |
| `.form-field select.field` and help navigation | Contact, LS machine administrator, support and mobile help | 44 px | 40 px canonical |
| `.spares-select` | Laundry spare-parts manufacturer, category and model selectors | 48 px | 40 px canonical |

Total in scope: **44 authoring points** — 26 static HTML instances and 18
JavaScript constructions. Standard selects now consume `--ut-select-height`,
an alias of the shared 40 px `--ut-control-height-standard` token. The compact
approximately 26 px recipe remains unchanged, as do all selectors inside NFC
dashboard machine cards. All 44 in-scope selects now share the same filled
10 × 6 px triangle, vertically centered at 12 px from the right edge through
the shared indicator, size, offset and padding tokens. The isolated showroom
represents the resulting two approved heights and their common indicator.

## Checkbox Inventory

Scope includes native `input[type="checkbox"]` controls and interactive
elements that expose `role="checkbox"`. Counts describe authoring points, not
simultaneous DOM instances: permissions, machine assignments, images and task
rows can render each recipe repeatedly.

| Current recipe | Authored points | Current contexts |
| --- | ---: | --- |
| Native 16 px token with canonical action-green accent | 21 | Contact and support consent, Laundry spare-parts privacy, incident disconnection and control-panel collaborator |
| Browser-native size with canonical action-green accent | 8 | Laundry machine administrator, retained images, dashboard users, profile confirmation and global todo completion |
| Tokenized 2 rem × 1.125 rem switch with 0.875 rem thumb | 6 | Dashboard email-notification preferences |
| 2.75 rem × 2.75 rem button with `role="checkbox"` | 2 | Machine-card and global task completion |

Total in source: **37 authoring points** — 35 native checkboxes and 2 semantic
checkbox buttons. Twenty-one native checkboxes now consume both the 16 px
`--ut-checkbox-size` token and `--ut-checkbox-accent`, an alias of the same
`--ut-action-primary` green used by submit buttons. Another eight keep their
browser-native size while sharing the canonical green; disabled permission
states retain their attenuated gray treatment. Switches and semantic
task-completion buttons retain their distinct functional forms. The default
switch now consumes shared 32 × 18 px track, 14 px thumb, inset and travel
tokens so its scale sits closer to the 16 px checkbox. The resulting four
families are represented in the isolated showroom.

## Buttons

### Ordinary action buttons

Ordinary text actions now share one authored base through tokens in
`static/css/tokens/unatomo-control-sizes.css`: 40 px minimum height,
`1.25rem` inline padding, `0.95rem` type, weight 400 and normal line-height.
Shape has two contextual tokens: a pill for public or standalone calls to
action, and a 12 px radius for actions inside the app, beside a field or grouped
with another button. Color and interaction states remain semantic or
product-specific.

| Authored recipe | Covered context | Geometry status |
| --- | --- | --- |
| Shared `.ut-button` | Contact submits | Canonical |
| Core `.btn-pill` in `styles.css` | Main landing actions | Tokenized |
| Core `.btn-primary` / `.btn-secondary` | NFC auth and public detail action | Contextual radius tokenized |
| Corporate `.btn-pill` in `landing/ld_about.css` | Localized corporate pages | Tokenized |
| Laundry `.btn-pill` | Service and spare-parts flows | Pill standalone; 12 px in grouped flows |
| Studio `.studio-button` | Studio landing calls to action | Tokenized |
| NFC public `.landing-button` | Registration and access flows | Pill standalone; 12 px beside fields |
| NFC `.onboarding-submit` | Dashboard onboarding | 12 px app action |
| Laundry `.catalog-button` | Catalog administration | 12 px grouped/admin action |
| Laundry `.upload-button` | Spare-parts image upload | Transparent standalone pill |
| NFC `.profile-save-btn` | Profile and owner settings | 12 px app action |
| NFC dashboard `.btn-save` | Todo and suggestions submits | 12 px app action |

The 16 localized contact experiences use the same canonical submit
component: `.ut-button.ut-button--primary` inside `.ut-form-actions`. There are
14 public contact routes plus the shared NFC dashboard support form rendered
in Spanish and English. The authored contract is 40 px high, pill-shaped,
`0.95rem`, weight 400 and centered inside a `5.5rem` action row.

The ordinary-button scope deliberately excludes icon-only controls, navigation,
menus, option rows, disclosure toggles, dense utilities, segmented controls and
the separate NFC decision-action families. In particular, the SSL simulator's
mobile unused-machine toggle is a disclosure control, not an ordinary action.

The canonical button-height scale is now 32, 36 and 40 px through compact,
utility and standard tokens. Four authored 42 px recipes and the sole 50 px
submit recipe now consume the 40 px standard token. Geometry roles remain
separate from color: at 40 px the current system supports canonical green
primary actions and neutral light or transparent secondary actions.

Color is a theme or semantic role decision and remains separated from geometry. Green
action buttons share `--ut-action-primary`, `--ut-action-primary-hover` and
`--ut-action-primary-active` across Core, NFC, Laundry and Studio. All contact
submits, catalog validation and suggestion submission consume that family;
non-interactive success/status greens remain separate. Spare-parts image upload
and public NFC registration are transparent secondary actions.

### NFC dashboard decision actions

The dashboard currently has two clearly different `Aceptar` / `Cancelar`
families:

| Context | Classes | Authored geometry | Semantic treatment |
| --- | --- | --- | --- |
| Dense inline editing | `.mc-location-accept`, `.mc-location-cancel` | automatic height, `0.15rem 0.4rem` padding, `0.5rem` radius | both visually neutral |
| Modal decisions | `.status-incident-cancel`, `.status-incident-confirm` | 40 px minimum through the standard token, `0.45rem 0.85rem` padding, `0.65rem` radius | cancel neutral; confirm red, gray or green by operation |

The dense pair is reused beyond location editing for user, PIN, transfer and
invitation workflows. Its small size is therefore a real dashboard pattern,
not a one-off typo. Modal decisions now join the 40 px standard control family;
the dense inline pair remains separate until reviewed in place.

### Shared back and top controls

`static/css/components/nfc-minimal-page-nav.css` and the related site injector
already define a shared fixed navigation pair for `Volver` and `Arriba`. Each
control is 40 × 40 px, circular, translucent, blurred and softly elevated. The
top action appears after 24 px of scroll. This is evidence of an existing
cross-page component, but it should remain separate from the taxonomy of text
action buttons.

### Utility and language controls

| Family | Utility height | Utility width | Language minimum width | Icon size |
| --- | ---: | ---: | ---: | ---: |
| Corporate secondary pages | 36 px | 44 px | 66 px | 18 px |
| Laundry Services | 36 px | 44 px | 66 px | 18 px |
| Studio | 36 px | 44 px | 66 px | 18 px |
| Corporate root landing | 36 px | language-only | 52 px | 18 px |
| NFC public topbar | 32 px | 40 px | 66 px | 18 px |

This reveals a likely component family with at least two density variants. The
32 px NFC public control must not silently be changed to 36 px: it may be an
intentional fit for that header. The shared 18 px icon and 66 px language
minimum are stronger cross-profile candidates than the external height.

Language menus also show strong convergence: 160 px minimum width, `0.6rem`
container padding, `0.5rem 0.75rem` option padding, `0.6rem` option radius and
`0.95rem` option text. Background and shadow differ by profile.

## Typography Foundations

The following font stack is repeated in the principal families and is a strong
foundation candidate:

```css
ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
"Helvetica Neue", Arial, sans-serif
```

Current body sizing is not fully uniform: Core, Corporate and Laundry Services
commonly begin at `0.95rem`, while Studio and NFC landing contexts use `1rem`.
This may represent page-density profiles rather than an inconsistency.

Repeated semantic-looking values include:

- ordinary UI and legal copy at `0.95rem`;
- labels at `0.85rem`;
- consent/help copy around `0.82rem`;
- compact metadata around `0.68rem` to `0.75rem`;
- menu labels at `0.7rem` with increased letter spacing.

Heading scales diverge more substantially, especially between editorial,
landing and Studio hero treatments. The future type contract should therefore
separate stable UI roles from expressive display roles. Hero headings are not
the right place to begin standardization.

## Container Observations

Three widths recur but currently mean different things:

- 600 px: narrow card or contact-form reading width;
- 800 px: general application/page shell and wider form container;
- 876 px: editorial/legal reading shell.

These should not become one universal `--container-width`. A likely future
contract will name them by purpose, for example narrow form, standard content
and editorial content. Names and values remain open until visual review.

## NFC Density Notes

NFC retains several legitimate density contexts even after the current
standardization:

- 32 px public-header controls;
- 40 px onboarding fields and steppers;
- 40 px public landing actions;
- 40 px standard `.field` controls;
- 40 px onboarding submit action;
- dense dashboard controls adjusted within feature layouts.

The standard therefore uses a small named size scale rather than forcing every
control into one height. Dense dashboard actions and icon-only controls remain
separate review contexts.

## Candidate Decisions for Review

These are the best-supported first decisions, but they remain Candidate:

1. Adopt the repeated system font stack as the default foundation.
2. Define the ordinary field size around the existing 44 px implementation.
3. Define 12 px as the ordinary field/control radius, while retaining pill and
   compact variants.
4. Preserve the existing 160 px textarea minimum as the ordinary contact-form
   default.
5. Define shared label, consent and form-gap tokens from the already converged
   contact implementations.
6. Define named narrow, standard and editorial container roles instead of one
   universal maximum width.
7. Model control sizing as several named densities, not one forced height.

## Decisions Still Requiring Visual Evidence

- whether the standard contact form should be 600 px or 800 px;
- whether contact forms should use auto-fit or an explicit two-column layout;
- compact versus ordinary utility-control heights;
- the canonical focus treatment across light and dark profiles;
- whether foreground-colored contact submits should eventually join the green
  primary-action role;
- mobile layout behavior with long translated labels and consent text;
- which values are genuine NFC exceptions versus candidates for future
  compatibility mapping.

## Current Standardization Backlog

This is the living list for reducing the remaining style debt:

- [x] Ordinary action buttons: one shared base across all 12 authored recipes,
  with pill and 12 px radii selected by composition; semantic color remains
  contextual.
- [ ] Dense NFC `Aceptar` / `Cancelar`: decide whether to retain or promote to
  a named compact decision family, and correct its showroom evidence badge.
- [ ] Checkbox taxonomy: reduce the remaining native, standard and semantic
  families without erasing meaningful behavior.
- [ ] Textareas, labels and internal form spacing: inventory, choose and migrate
  common contracts.
- [ ] Typography and spacing: move the documented scale from showroom evidence
  into shared production tokens where repetition supports it.
- [ ] Semantic colors: continue sharing success, danger, accent, canvas and
  surface roles across products.
- [ ] Explicit exceptions: document the 26 px compact controls and the dense
  machine-card/dashboard controls that should not inherit ordinary sizing.

## Next Inventory Slice

The foundations pass is complete in
`docs/UNATOMO_UI_FOUNDATIONS_INVENTORY.md`. It covers typography, spacing,
shape, controls, containers, responsive boundaries, color, elevation, motion
and focus behavior. Continue through the backlog one bounded component family
at a time, applying shared tokens only after its scope and exceptions are
agreed.
