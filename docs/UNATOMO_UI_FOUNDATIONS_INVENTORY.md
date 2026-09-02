# UNATOMO UI Foundations Inventory

Status: draft 0.1  
Contract: `docs/UNATOMO_UI_CONTRACT.md`  
Related component inventory: `docs/UNATOMO_UI_INVENTORY.md`  
Current phase: static source inventory only  
Runtime adoption: none

## Scope and Method

This document completes the first broad inventory of UNATOMO visual
foundations: typography, spacing, geometry, containers, responsive boundaries,
color, elevation, motion and focus behavior.

The measurements are authored CSS values, not computed-style snapshots. A
frequent value is evidence of an established pattern, but frequency alone does
not make it Canonical. Counts include all 54 tracked source CSS files and
exclude generated output.

## Typography

### Font family

Core, Corporate, Laundry Services and Studio repeat the same system stack:

```css
ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
"Helvetica Neue", Arial, sans-serif
```

This is the strongest typography foundation candidate. Its cross-platform
nature also means that exact glyph metrics and intermediate weights must be
tested on more than one operating system.

### Authored size distribution

The most repeated font sizes across the source are:

| Value | Declarations | Likely current roles |
| --- | ---: | --- |
| `0.95rem` | 46 | Ordinary UI, fields, buttons and legal copy |
| `0.9rem` | 36 | Compact controls and secondary UI |
| `1rem` | 35 | Body/lead copy and comfortable public UI |
| `0.82rem` | 34 | Dense metadata, consent and operational rows |
| `0.78rem` | 32 | Dense dashboard metadata |
| `0.85rem` | 28 | Labels and secondary text |
| `0.75rem` | 24 | Compact status and navigation metadata |
| `0.72rem` | 19 | Section labels and compact editorial UI |
| `0.68rem` | 16 | Microcopy and disclosure labels |
| `0.7rem` | 16 | Language labels and compact navigation |

There is clear clustering, but too many near-neighbor values to declare a
finished scale. Dashboard density accounts for part of the difference; another
part is local optical adjustment.

### Authored weight distribution

The dominant weights are 600, 700, 650, 500 and 400. Public and Studio display
typography also uses fine weights such as 560, 570 and 590. Those values may
render differently depending on whether the active system font supports
variable weights or synthesizes them.

A future type contract should distinguish:

- stable UI weights, likely selected from a small portable set;
- expressive display weights that may remain profile-specific;
- emphasis semantics (`regular`, `medium`, `semibold`, `bold`) from their raw
  numeric implementation.

### Line height and tracking

The most frequent line heights are 1, 1.4, 1.45, 1.5, 1.2 and 1.35. This
suggests three useful role families:

- icon/control labels near 1;
- compact UI and metadata around 1.35 to 1.45;
- ordinary readable UI around 1.5;
- editorial/lead copy, less frequently, around 1.6 to 1.75.

Positive tracking of `0.08em` and `0.12em` is established for uppercase or
compact labels. Negative tracking around `-0.03em` to `-0.055em` belongs mainly
to display headings.

### Heading families

Current headings reveal intentional product profiles rather than one broken
scale:

| Context | Representative top heading |
| --- | --- |
| Core application | `clamp(2.5rem, 8vw, 4rem)` |
| Corporate/Laundry/legal | `clamp(2.2rem, 4.6vw, 3.2rem)` |
| NFC public landing | `clamp(2.55rem, 5.2vw, 4.2rem)` |
| Studio hero | `clamp(2.75rem, 5.2vw, 4.9rem)` |

The standardization target should therefore be a shared UI type scale plus
named display profiles. It should not force every hero to have the same size.
HTML heading level and visual role must remain separate.

### Typography candidate clusters

These clusters are suitable for review, not yet Canonical:

- micro: current `0.68rem` to `0.72rem`;
- caption/status: current `0.75rem` to `0.82rem`;
- label/compact body: current `0.85rem` to `0.9rem`;
- ordinary UI body: current `0.95rem`;
- comfortable/public body: current `1rem`;
- display roles: profile-specific responsive clamps.

Choosing one value inside every cluster may cause subtle wrapping changes,
especially in NFC. Compatibility aliases may be safer than immediate value
replacement.

## Spacing

### Repeated authored values

The most common `gap` values are:

| Value | Declarations |
| --- | ---: |
| `1rem` | 53 |
| `0.5rem` | 37 |
| `0.45rem` | 29 |
| `0.65rem` | 29 |
| `0.75rem` | 28 |
| `0.35rem` | 24 |
| `0.4rem` | 23 |
| `0.55rem` | 22 |

Common larger steps include `1.1rem`, `1.25rem`, `1.5rem` and `2rem`. The
contact-form grid consistently uses `1rem 1.5rem`.

The source already contains a conventional broad rhythm around 4, 8, 12, 16,
20, 24 and 32 px, but dense UI also uses optical steps around 6, 7, 9, 10 and
14 px. Rounding all of those to a rigid four-pixel grid would change carefully
adjusted layouts.

### Proposed spacing model for review

The eventual model should support two related sets:

- **structural spacing** for page, grid and component layout;
- **optical spacing** for icon gaps, dense rows and internal control alignment.

Structural values can converge strongly. Optical values should be named and
retained where they affect established geometry, especially in NFC.

No canonical spacing numbers are selected in this inventory.

## Shape and Borders

### Radius distribution

| Value | Declarations | Current use tendency |
| --- | ---: | --- |
| `999px` | 50 | Pills, circular status and fully rounded actions |
| `0.75rem` | 43 | Ordinary fields, buttons, menus and controls |
| `0.5rem` | 32 | Compact cards and dense controls |
| `8px` | 25 | Mostly operational/dense UI |
| `1rem` | 17 | Larger panels and disclosure shells |
| `0.85rem` | 16 | Contact cards and medium panels |
| `0.6rem` | 15 | Menu options and compact surfaces |

`0.75rem` is the strongest ordinary-control radius candidate. Pill is already
a distinct shape role. The overlap between `0.5rem` and 8 px is exact at the
normal root and reflects mixed units rather than different geometry.

### Borders

`1px solid var(--border-subtle)` appears 201 times, far more than any other
border declaration. A one-pixel semantic subtle border is therefore a strong
foundation candidate.

Transparent one-pixel borders are also common and preserve dimensions across
states. Strong, danger, selected and focus borders need semantic roles rather
than ad hoc color values.

## Control Geometry

The initial component inventory identified context sizes of 32, 36, 40, 42,
44, 48 and 50 px. The adopted button contract now consolidates button heights
to 32, 36 and 40 px; former 42 and 50 px button recipes map to 40 px. Historical
44 and 48 px observations belonged chiefly to fields reviewed separately.

The future size scale should name functional densities, for example compact,
standard and prominent, without assuming that every numeric value survives as
a public token. Existing NFC values should first map to aliases with identical
pixels.

Width observations reinforce several stable primitives:

- 18 px is the common icon size;
- 44 px is a common utility-control width outside the compact NFC public
  header;
- 66 px recurs as the minimum language-control width;
- full-width fields and action rows are common in narrow layouts.

## Containers

Repeated maximum widths have distinct semantic purposes:

| Width | Current role |
| ---: | --- |
| 600 px | Narrow cards and contact forms |
| 800 px | Standard application/page shell and wide forms |
| 876 px | Editorial and legal reading shell |
| 1120 px | Studio wide composition (`--studio-width`) |

These should become named container roles, not one global `max-width`. Wider
landing compositions may remain profile recipes built from the same gutter
and breakpoint foundations.

The recurring page padding `110px 1.5rem 2.5rem` also shows an established
relationship with 75 px fixed topbars, but this is a page-shell recipe rather
than a universal spacing token.

## Responsive Boundaries

The source contains 23 authored width thresholds. The dominant boundaries are:

| Boundary | Occurrences | Likely role |
| --- | ---: | --- |
| 768 px | 20 | Main mobile/tablet maximum |
| 769 px | 8 | Paired desktop minimum |
| 600 px | 8 | Narrow content/forms |
| 560 px | 7 | Small-phone component adaptation |
| 480 px | 5 | Compact phone |
| 900 px | 5 | Wide editorial/landing adaptation |
| 640 px | 5 | Medium component adaptation |
| 1280 px | 4 | Desktop side trees/advanced layout |

Pairs such as 768/769 and 1279/1280 express intentional non-overlapping
ranges. They should be represented as one conceptual boundary in a future
contract while preserving the authored comparison semantics.

Not every component breakpoint should become a global viewport token. The
future review should distinguish:

- product-shell boundaries;
- content/container boundaries;
- component-local wrapping points;
- candidates for container queries in new work.

## Color and Themes

### Existing profile behavior

- Core supports explicit light and dark themes plus system preference.
- Corporate secondary pages support light and dark values; the root corporate
  landing is intentionally light.
- Laundry Services currently declares a light profile.
- Studio forces a dark profile even when the root theme attribute changes.
- NFC public and dashboard surfaces inherit Core theme foundations and add
  context-specific surfaces.

This supports the contract model: one semantic vocabulary with different
profile values, not one global palette.

### Token fragmentation

The CSS contains 112 custom-property definitions representing 53 unique names.
The most repeatedly defined names are `--bg`, `--fg`, `--border-subtle`,
`--panel-bg`, `--accent` and `--accent-strong`.

Those names prove common concepts but are too generic for safe cross-project
distribution. A future namespace and semantic hierarchy are needed. Existing
variables can initially map to namespaced tokens rather than being renamed in
place.

### Direct color families

The initial inventory revealed several semantic families with multiple
implementations:

- green action buttons formerly mixed `#16a34a`, `#16834b`, `#2da44e` and
  related hover values; they now consume the shared GitHub-derived action
  tokens while non-interactive success/status greens remain local;
- danger includes `#d33`, `#dc2626`, `#b91c1c` and contextual variants;
- blue links/actions commonly use `#2563eb` and `#1d4ed8`;
- orange is used for warning/attention roles;
- violet `#7c3aed` is reserved for superadmin-only signals and must not become
  a general brand accent.

Standardization should continue to assign semantic roles and state
relationships before changing raw colors. The action-token adoption was
limited to controls already classified as green actions; no global green
replacement was performed.

## Elevation and Layering

Shadows are less standardized than borders. `none` is common, while recurring
families include compact menu shadows, medium panel shadows and large overlay
shadows. Backdrop filtering appears in 16 CSS files and participates in the
visual identity of topbars and floating surfaces.

Z-index values range from negative layers through 25–80 application layers to
1100, 2000, 2100–2300 and 3000 overlay/topbar layers. Repeated values exist,
but there is no documented semantic layer scale.

The future contract should define named layers such as content, sticky,
navigation, menu, modal and critical overlay. Existing numeric values should
be mapped only after checking stacking contexts; changing a number can alter
behavior even when screenshots of a closed page look identical.

## Motion

### Duration and easing observations

The most frequent durations are 160, 320, 120, 220, 180 and 140 ms. The source
suggests natural motion groups:

- immediate feedback: roughly 120–160 ms;
- ordinary state or panel feedback: roughly 180–220 ms;
- larger disclosure/layout transitions: roughly 260–320 ms.

Most transitions use `ease`. The curve
`cubic-bezier(0.22, 1, 0.36, 1)` is repeated for larger panels and entrances.
Linear easing is primarily associated with continuous or mechanical motion.

These groups are Candidates, not fixed tokens. Durations such as 340 ms in
claim loops and long continuous animations serve different purposes.

### Reduced motion

Reduced-motion handling is present but distributed: 15 CSS files and 13
JavaScript files explicitly inspect `prefers-reduced-motion`. Coverage includes
Core, Studio, NFC landing, dashboard components, onboarding, QR print, Laundry
responsive behavior, logo rotation, claim loops and disclosure interactions.

The missing piece is a single policy describing:

- which decorative motion stops completely;
- which state change remains but becomes immediate;
- which functional feedback must remain perceivable;
- how CSS and JavaScript behavior stay consistent.

## Focus and Input Accessibility

`:focus-visible` appears across 36 CSS files. This is good evidence of an
existing accessibility practice, but the treatment is not yet uniform.
There are also 51 `outline: none` or `outline: 0` lines across 24 CSS files;
each must eventually be checked for an equivalent visible focus state rather
than being globally rewritten.

The Core base raises fields to 16 px on narrow viewports, which avoids mobile
browser zoom behavior. Equivalent behavior should be verified for Studio and
other isolated form styles during visual/browser testing.

The future focus contract should specify ring thickness, offset, contrast and
theme mapping while allowing high-density operational controls to preserve
their geometry.

## Foundation Candidate Register

The inventory now supports the following review candidates:

| ID | Candidate | Evidence | Maturity |
| --- | --- | --- | --- |
| F-01 | Shared system font stack | Repeated across all primary families | Candidate |
| F-02 | Ordinary UI text role around current `0.95rem` | Most frequent font size | Candidate |
| F-03 | Separate UI and display typography scales | Heading profiles intentionally diverge | Candidate |
| F-04 | Structural and optical spacing sets | Broad rhythm plus dense adjustments | Candidate |
| F-05 | Ordinary control radius at current `0.75rem` | 43 declarations and contact convergence | Candidate |
| F-06 | Semantic subtle border at 1 px | 201 declarations | Candidate |
| F-07 | Button height scale at 32/36/40 px | Adopted compact, utility and standard button tokens | Canonical |
| F-08 | 18 px ordinary icon role | Strong cross-family recurrence | Candidate |
| F-09 | Narrow, standard, editorial and wide containers | Repeated 600/800/876/1120 px roles | Candidate |
| F-10 | Conceptual responsive boundaries | Strong 768/769 and secondary clusters | Candidate |
| F-11 | Namespaced semantic color system with profiles | Shared concepts, fragmented raw values | Candidate |
| F-12 | Named elevation and z-index layers | Repeated patterns without contract | Candidate |
| F-13 | Fast, standard and large motion groups | Strong duration clusters | Candidate |
| F-14 | Unified reduced-motion and focus policy | Existing distributed coverage | Candidate |

## Inventory Completion and Next Step

The broad foundations inventory is now sufficient to stop measuring globally.
Additional inventory should be component-specific and performed only when that
component enters review.

The next step is a decision packet for the lowest-risk foundations: font stack,
ordinary UI text, field geometry, border, radius, icon size and container role
names. Approval would make selected items Canonical for new work only. It would
still make no runtime change to existing pages, and it would not authorize an
NFC migration.
