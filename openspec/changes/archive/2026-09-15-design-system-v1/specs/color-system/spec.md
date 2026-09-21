# Delta for color-system

## Purpose

Pivot the `color-system` hex tokens to the Cyber-Jade reference, add the `input` background and `border-jade` utility, and explicitly supersede the hex values committed during `portal-fase0a-base`. The behavioral shape of the spec (chrome vs. data separation) is preserved; only the token values change.

## Modified Capabilities

### Token pivot

The original `color-system` spec established the jade `#2EDC8C` palette and `bg` `#080D12`. The Cyber-Jade pivot replaces these with the values listed in the `cyber-jade-tokens` spec. After archive, the main `color-system` spec MUST reflect the new hex values verbatim.

## REMOVED Requirements

### Requirement: Primary token is jade

(Reason: hex pivot — the prior requirement bound `primary` to `#2EDC8C` which is superseded by `#00FF9D` per the Cyber-Jade reference. The behavioral rule "primary is jade" remains; only the hex value changes.)
(Migration: the new requirement `Brand tokens` in the `cyber-jade-tokens` spec replaces this with the updated hex table.)

### Requirement: Background and surface tokens

(Reason: hex pivot — `bg` and `surface` values change to deepen the abyssal feel of Cyber-Jade.)
(Migration: replaced by the `Brand tokens` table in `cyber-jade-tokens`. No call-site changes needed — Tailwind resolves the same class names.)

### Requirement: Semantic profit and loss tokens

(Reason: hex pivot — `loss` changes from `#FF5C5C` to `#FF2A55`; `profit` stays solid-only and is reaffirmed below.)
(Migration: superseded by the `Semantic and text tokens` table in `cyber-jade-tokens`. The "no glow on profit/loss" rule is preserved and extended in the `Glow restriction` requirement there.)

## CHANGED Requirements

### Requirement: Glow restriction

(Previously: "The system SHALL restrict `glow-*` and `text-gradient-primary` styles to logos and main page titles. Financial data tables MUST use solid profit/loss colors with monospace font and no glow.")

The system SHALL restrict `glow-*` and `text-gradient-primary` styles to chrome only (logos, primary buttons, sidebar active items, badges, status dots). Financial data tables, P&L values, balance cells, and any numeric value rendered in a data-dense surface MUST use solid profit/loss colors with monospace font and NO glow. The glow restriction is enforced by the `style-enforcement` spec.

#### Scenario: Logo uses glow
- GIVEN the `JadeCapitalSuite` logo
- WHEN rendered
- THEN it MAY use `glow-primary` and `text-gradient-primary`

#### Scenario: Trade table forbids glow
- GIVEN a trade operations table
- WHEN a numeric cell renders
- THEN it MUST use `font-mono` and a solid `text-profit` / `text-loss` without glow or gradient

#### Scenario: P&L in a balance cell forbids glow
- GIVEN a `<DataTable>` cell showing `-2.4%`
- WHEN rendered
- THEN it MUST be solid `text-loss` + `font-mono` with no `shadow-*` or `text-gradient-*`

### Requirement: Cyan pivot coverage

(Previously: "The change MUST remove all literals matching `cyan`, `#00FFFF`, `text-primary`, `border-primary`, `bg-primary`, `glow-cyan` and update them to jade equivalents across the SPA.")

The change MUST remove all literals matching `cyan`, `#00FFFF`, `rgba(0,255,255,*)`, `stroke="#00FFFF"`, and `pulse-cyan` and update them to Cyber-Jade equivalents across the SPA. The drift is enforced by the `style-enforcement` spec (CI grep guard + ESLint rule + stylelint config).

#### Scenario: No cyan literals remain
- GIVEN a repository-wide ripgrep for `cyan|#00FFFF|glow-cyan|pulse-cyan`
- WHEN the pivot completes
- THEN zero matches SHALL exist in `src/`

#### Scenario: Semantic classes re-mapped
- GIVEN a file with `text-primary`
- WHEN read after pivot
- THEN its rendered color MUST equal jade `#00FF9D`

## ADDED Requirements

### Requirement: Input background token

The system SHALL expose `input` = `#0A1017` as the default background for form controls (`<Input>`, `<Select>`, `<Textarea>`). This is a new token — not present in the `portal-fase0a-base` spec.

#### Scenario: Input uses input token
- GIVEN a `<Input>` primitive
- WHEN rendered
- THEN its `background-color` MUST equal `#0A1017`

### Requirement: border-jade utility

The system SHALL expose a Tailwind utility `border-jade` resolving to `1px solid rgba(0,255,157,0.2)`. Cards, panels, and form controls on the default state MUST use this utility instead of ad-hoc rgba strings.

#### Scenario: Card border
- GIVEN a `<Card>` primitive
- WHEN rendered in default state
- THEN its `border` MUST equal `1px solid rgba(0,255,157,0.2)`

### Requirement: info token bound to secondary cyan

The system SHALL expose `info` = `#00B8FF` as the secondary cyan / AI-viz token. This binding is final and supersedes any prior informational token.

#### Scenario: AI-viz uses info
- GIVEN an `<NeuralNetwork>` decorative asset
- WHEN rendered
- THEN its node + edge colors MUST equal `#00B8FF`
