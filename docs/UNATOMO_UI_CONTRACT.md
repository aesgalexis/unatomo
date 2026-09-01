# UNATOMO UI Contract

Status: draft 0.1  
Current phase: documentation and inventory only  
Runtime adoption: none

## Purpose

This document is the starting contract for a deeply standardized UNATOMO
visual system. It will define the foundations and reusable components that new
UNATOMO products should share, while allowing each product and page to retain
its own composition, theme and functional requirements.

The intended result is a common visual grammar, not one identical layout for
every surface. A landing page, an operational dashboard and an editorial site
may look different while using the same control anatomy, typography scale,
spacing rules, interaction states and accessibility behavior.

## Current Safety Boundary

The contract remains documentary by default. Two runtime adoptions are now
explicitly approved:

1. the shared primary-action color token: `#2da44e` at rest, `#2c974b` on
   hover/focus and `#26863f` when active;
2. the shared contact-submit component used by Corporate, NFC, Laundry
   Services and Studio contact forms.

The contact-submit contract is intentionally narrow. It authorizes the shared
button anatomy, states and action-row geometry for those forms only; it does
not authorize broad normalization of unrelated buttons or form fields.

In particular, UNATOMO/NFC is a protected surface. Its layouts and controls
have been adjusted individually and must not be normalized by a broad CSS
refactor. Any future NFC adoption requires all of the following first:

1. an approved canonical component or token;
2. visual baselines for the affected routes, themes, viewports and states;
3. a narrowly scoped migration plan that preserves the existing cascade;
4. before-and-after visual comparison;
5. explicit review of exceptions where operational density or geometry is
   intentional.

The current dashboard import order is part of its behavior. The constraints in
`docs/DASHBOARD_CSS.md` remain authoritative. Green buttons and interactive
control states consume the shared action family; non-interactive success and
operational-status greens remain separate semantic values.

## Contract Language

Every recorded value or component must have one of these maturity states:

- **Observed**: exists in one or more current surfaces. It is evidence, not a
  recommendation.
- **Candidate**: appears suitable for standardization but still needs design
  review and comparison across products.
- **Canonical**: approved as the default for new UNATOMO work.
- **Exception**: intentionally differs from the canonical rule for a documented
  functional or brand reason.
- **Legacy**: retained for compatibility and eligible for later migration.

No value becomes canonical merely because it is common today. Repetition may
represent either a sound pattern or duplicated historical implementation.

## Layer Model

The system is divided into four layers. Lower layers should be more stable and
more widely shared.

### 1. Foundations

Brand-independent measurements and behavior:

- font families and type scale;
- control heights and internal spacing;
- spacing scale;
- border widths and radius scale;
- focus, hover, active, disabled, loading and error states;
- motion duration and easing;
- responsive breakpoints and container rules;
- accessibility and reduced-motion behavior.

### 2. Semantic tokens

Purpose-based values instead of page-specific colors:

- canvas, surface and elevated surface;
- primary and muted text;
- subtle and strong borders;
- action, success, warning and danger;
- focus ring and selected state.

Themes may provide different values for these purposes. A dark Studio theme
and a light Laundry Services theme can therefore share component anatomy
without sharing colors.

### 3. Components

Reusable UI contracts such as:

- buttons and icon buttons;
- text fields, selects and textareas;
- checkbox and radio controls;
- form containers and action rows;
- topbars and language menus;
- dialogs, menus and basic cards;
- feedback, empty, loading and error states.

A component contract includes markup, dimensions, tokens, states, responsive
behavior, accessibility requirements and permitted variants. CSS alone is not
a complete component when behavior or markup is required.

The first canonical runtime component is the contact submit pair:

- `.ut-button.ut-button--primary`: 40 px high, pill radius, `0.95rem`, weight
  400, shared action colors and common hover, focus, active and disabled states;
- `.ut-form-actions`: full-width, centered action row with a `5.5rem` minimum
  height;
- `.ut-form-status[hidden]`: no reserved hidden status space before the action
  row.

Its source lives in `static/css/tokens/` and `static/css/components/`. Product
styles may place the component but must not redefine this ordinary contact
submit presentation.

### 4. Product and page styles

NFC, Studio, Laundry Services and future products may define:

- theme colors and imagery;
- information density;
- page composition and grids;
- product-specific components;
- deliberate, documented exceptions.

This layer should finish the product experience, not redefine ordinary buttons
or fields from scratch.

## Initial Inventory

The measurement matrix and current source observations live in
`docs/UNATOMO_UI_INVENTORY.md` and
`docs/UNATOMO_UI_FOUNDATIONS_INVENTORY.md`. Those documents are evidence for
this contract and do not make their candidates canonical.

The first reviewable vocabulary and value proposal lives in
`docs/UNATOMO_UI_FOUNDATIONS_PROPOSAL.md`. It remains Proposed until explicitly
approved and has no effect on existing pages.

An isolated implementation of that proposal lives at `dev/ui-showroom/`. It is
a review surface only: no production HTML imports its tokens or components and
the static production build does not include the `dev/` directory.

The repository currently contains several visual families rather than a single
stylesheet:

- core and NFC base: `styles.css`;
- dashboard: `static/css/dashboard.css` and its ordered imports;
- public corporate pages: `landing/ld_styles.css` and related files;
- Laundry Services: `laundryservices/ls_styles.css` and its ordered imports;
- Studio: `studio/studio.css`;
- isolated operational or administrative surfaces with additional styles.

Across the tracked source there are currently 54 CSS files with approximately
20,500 physical lines. The dashboard and Laundry Services already have stable
manifest entry points, which is useful architecture but does not yet constitute
a shared design system.

### Repeated observations

The following are observations, not canonical rules:

- the primary system font stack is repeated across core, public, Laundry
  Services and Studio;
- `--bg`, `--fg` and `--border-subtle` recur, but their values and theme rules
  differ;
- several topbars use a height of 75 px and a 52 px logo;
- several utility and language controls use a height of 36 px;
- multiple buttons use `0.6rem 1.25rem` padding;
- several form fields use `0.65rem 0.8rem` padding;
- content and form containers currently use several widths, including 600 px,
  800 px and 876 px, with different responsibilities;
- generic names such as `.icon-button`, `.lang-menu`, `--bg` and `--fg` exist
  in multiple style families and cannot be merged safely by name alone.

These repetitions identify the first audit candidates. Exact computed sizes,
states and responsive behavior must be compared before choosing standards.

## First Standardization Domains

The first contract work should concentrate on high-reuse, measurable elements.
The order below is intentional.

### Typography

Define a semantic type scale independent of HTML tag choice. HTML heading
semantics remain `h1` through `h6`, while visual roles may include display,
title, section title, subsection title, body, small, label and caption.

The audit must record font family, size, weight, line height, letter spacing and
responsive behavior for each role.

### Controls

Define a small height scale for buttons and fields, plus explicit compact and
large variants. Buttons, inputs, selects and compatible controls using the same
size should align on the same external height.

The contract must distinguish ordinary controls from icon-only controls,
multiline fields, dense operational controls and touch targets. NFC density may
justify exceptions, but those exceptions must be deliberate rather than local
accidents.

### Forms

Standardize form geometry separately from field content:

- outer page container;
- form or card maximum width;
- field width and column behavior;
- vertical and horizontal gaps;
- label, help and error placement;
- action alignment;
- mobile collapse behavior.

The contact forms are the preferred first comparison set because they expose
the same interaction pattern across multiple visual families. A future shared
width must be selected after distinguishing full page width, readable content
width and actual form-card width.

### Interaction states

Every canonical interactive component must specify hover, focus-visible,
active, disabled, loading, success and error behavior where applicable. Color
alone must not be the only indication of a state.

## Decision Rules

- New UI should use canonical foundations and components when they exist.
- Until a rule is canonical, new work should reuse the closest established
  product pattern and record the unresolved decision here.
- A functional constraint, accessibility need or intentional product identity
  may create an exception.
- A different creation date or source file is not, by itself, a valid
  exception.
- Visual standardization and visual redesign are separate changes.
- Structural extraction must preserve selector behavior, specificity and
  cascade order unless a reviewed redesign explicitly says otherwise.
- Shared public names should eventually be namespaced to avoid accidental
  collisions. The naming scheme is not yet selected.

## Roadmap

### Phase 0 — Inventory and contract

Document existing values, components, states and differences. Classify each as
observed, candidate, canonical, exception or legacy. No runtime adoption.

### Phase 1 — Visual baseline

Create deterministic visual coverage for representative public, Studio,
Laundry Services and NFC routes at agreed desktop and mobile viewports. Include
light/dark themes and interactive states where relevant.

### Phase 2 — Foundations

Approve the first token contracts for typography, spacing, control sizes,
form geometry, borders, radii, focus and motion. Implement them in an isolated,
unconsumed package or stylesheet so existing pages remain unchanged.

### Phase 3 — Reference components

Build and review buttons, fields, selects, textareas and form layouts in an
isolated showroom. Add markup and accessibility contracts alongside CSS.

### Phase 4 — New work by default

Use the approved system for new products and pages. Product profiles provide
themes and density without duplicating component anatomy.

### Phase 5 — Low-risk migration

Pilot adoption on a bounded, non-NFC surface. Compare all relevant screenshots
and preserve intentional product styling.

### Phase 6 — Gradual legacy adoption

Migrate existing surfaces only when there is clear value. NFC should be last
or remain partly adapted through compatibility aliases if that is safer. Deep
standardization does not require rewriting every proven operational detail.

## Required Deliverables Over Time

The mature system should eventually provide:

- this versioned contract;
- canonical design tokens;
- reusable, namespaced component styles and behavior where needed;
- product theme/profile entry points;
- a visual component showroom;
- visual regression coverage;
- a distribution method usable inside and outside this repository;
- a concise Codex skill or project template so “use the UNATOMO style” refers
  to a concrete, versioned implementation.

## Open Decisions

The following decisions are intentionally not made in draft 0.1:

- canonical control heights and size names;
- canonical form and readable-content widths;
- canonical typography scale;
- token and component namespace;
- package location and distribution method;
- whether existing products consume shared source directly or through
  compatibility mappings;
- which non-NFC surface should be the first migration pilot.

These decisions should be made from the inventory and visual comparisons, not
from a speculative redesign.
