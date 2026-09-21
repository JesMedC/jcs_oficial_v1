# Spec: color-system

## Purpose

Define the jade `#2EDC8C` token system for the JCS Portal and codify applicability rules that separate chrome (glow/neon) from data-dense surfaces (solid + monospace) so the brand pivot from cyan stays consistent across 100+ files.

## Requirements

### Requirement: Primary token is jade

The system SHALL expose `primary` (jade `#2EDC8C`) as the primary action color. It MUST apply to page headings, focus rings, primary buttons, inline links, and the brand glow halo.

#### Scenario: Heading uses jade
- GIVEN any portal or public page
- WHEN an `<h1>` / `<h2>` renders
- THEN it MUST use `text-primary` (jade) or `text-gradient-primary`

#### Scenario: Focus ring uses jade
- GIVEN any focusable element (input, button, link)
- WHEN it receives keyboard focus
- THEN the focus ring MUST be `ring-primary` with offset

### Requirement: Background and surface tokens

The system SHALL define `bg` = `#080D12` and `surface` = `#0D141B` (unchanged — already match mega-prompt). No other background tokens SHALL be introduced.

#### Scenario: Existing bg tokens preserved
- GIVEN the current `tailwind.config.ts`
- WHEN the color system is applied
- THEN `bg` and `surface` MUST remain `#080D12` and `#0D141B`

### Requirement: Semantic profit and loss tokens

The system SHALL expose `profit` = `#35D07F` (green) and `loss` = `#FF5C5C` (red) for trade outcomes. They MUST NOT be replaced by `primary`.

#### Scenario: Positive trade renders green
- GIVEN a trade with positive P&L
- WHEN rendered in any list or detail view
- THEN the value MUST use `text-profit`

#### Scenario: Negative trade renders red
- GIVEN a trade with negative P&L
- WHEN rendered in any list or detail view
- THEN the value MUST use `text-loss`

### Requirement: Glow restriction

The system SHALL restrict `glow-*` and `text-gradient-primary` styles to logos and main page titles. Financial data tables MUST use solid profit/loss colors with monospace font and no glow.

#### Scenario: Logo uses glow
- GIVEN the `JadeCapitalSuite` logo
- WHEN rendered
- THEN it MAY use `glow-primary` and `text-gradient-primary`

#### Scenario: Trade table forbids glow
- GIVEN a trade operations table
- WHEN a numeric cell renders
- THEN it MUST use `font-mono` and a solid `text-profit` / `text-loss` without glow or gradient

### Requirement: Cyan pivot coverage

The change MUST remove all literals matching `cyan`, `#00FFFF`, `text-primary`, `border-primary`, `bg-primary`, `glow-cyan` and update them to jade equivalents across the SPA.

#### Scenario: No cyan literals remain
- GIVEN a repository-wide ripgrep for `cyan|#00FFFF|glow-cyan`
- WHEN the pivot completes
- THEN zero matches SHALL exist in `src/`

#### Scenario: Semantic classes re-mapped
- GIVEN a file with `text-primary`
- WHEN read after pivot
- THEN its rendered color MUST equal jade `#2EDC8C`

## Dependencies

- `tailwind.config.ts`
- `src/styles/index.css`
- All components rendering primary-colored chrome

## Out of scope

- Dark/light theme variants (dark only for FASE 0A).
- New component-level color tokens beyond `primary`, `bg`, `surface`, `profit`, `loss`.
- Accessibility contrast audit beyond the focus-ring requirement.
