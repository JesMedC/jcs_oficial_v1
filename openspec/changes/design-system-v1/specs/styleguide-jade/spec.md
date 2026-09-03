# Spec: styleguide-jade

## Purpose

Define the public `/styleguide/jade` route that exposes every Cyber-Jade token, primitive, and decorative asset in one place. The route serves as the visual contract for the design language and is the canonical reference future `sdd-verify` runs will compare implementation against.

The route MUST be dark-mode-locked. No theme toggle.

## Requirements

### Requirement: Route registration

The system SHALL expose the route `/styleguide/jade` registered in the router with a `StyleguideJadePage` component living at `src/styleguide/JadeShowcase.tsx`. The route MUST be reachable only by authenticated users OR via an explicit `import.meta.env.DEV` flag during development. Visiting unauthenticated in production MUST redirect to `/login`.

#### Scenario: Authenticated user reaches styleguide
- GIVEN an authenticated session
- WHEN the user navigates to `/styleguide/jade`
- THEN `StyleguideJadePage` MUST render with HTTP 200

#### Scenario: Unauthenticated redirect
- GIVEN no session in production build
- WHEN the user navigates to `/styleguide/jade`
- THEN the router MUST redirect to `/login`

### Requirement: Showcase sections

The page MUST render the following sections in order: (1) Color tokens swatch grid; (2) Typography stack samples (display, body, mono); (3) Glow + glassmorphism demo card; (4) Every primitive from `primitive-library` in a usage example; (5) Decorative VFX (DotGrid + NeuralNetwork); (6) Anti-pattern gallery (numeric cell with glow = forbidden). Each section MUST have an `aria-labelledby` heading.

#### Scenario: All sections present
- GIVEN the page rendered
- WHEN queried by section heading
- THEN all six `aria-labelledby` headings MUST exist in the DOM

#### Scenario: Anti-pattern marked forbidden
- GIVEN the anti-pattern gallery
- WHEN rendered
- THEN each forbidden example MUST show a strike-through or `data-state="forbidden"` attribute

### Requirement: Dark-mode lock

The page MUST NOT render any theme toggle control. The `<html>` MUST carry `data-theme="dark"` while the page is mounted.

#### Scenario: No toggle present
- GIVEN the page rendered
- WHEN the DOM is queried for buttons or selects
- THEN no element labeled with "theme" or "modo" SHALL exist

### Requirement: Live controls (scoped)

The page SHOULD expose live controls for `DotGrid` opacity (range 0.01 → 0.10) and `NeuralNetwork` node count (range 6 → 24). Live controls MUST NOT extend to theme/color/font selection.

#### Scenario: Opacity control updates dot grid
- GIVEN the opacity slider at 0.07
- WHEN the user changes it to 0.03
- THEN the rendered `<DotGrid>` opacity MUST update without a full page reload

## Dependencies

- `cyber-jade-tokens`
- `primitive-library`
- `decorative-system`
- Existing `auth` context for gating

## Out of scope

- A generic `/styleguide` index (the existing `/styleguide/glass` stays as-is).
- Light theme previews.
- User-editable token overrides at runtime.
