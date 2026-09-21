# Spec: cyber-jade-tokens

## Purpose

Codify the Cyber-Jade color, typography, and effect tokens used across the JCS Portal. This spec is the binding reference for hex pivots, font stack additions, glow utility classes, and the separation rules that keep neon chrome distinct from data-dense surfaces.

This spec supersedes the hex values established in `portal-fase0a-base` (see `color-system` delta). All values below MUST be applied verbatim — no rounding, no perceptual rounding, no theme-variants.

## Requirements

### Requirement: Color tokens — brand

The system SHALL expose the following brand tokens in `tailwind.config.ts` under `theme.extend.colors`:

| Token | Value | Usage |
|-------|-------|-------|
| `primary.DEFAULT` | `#00FF9D` | Primary action, focus, brand |
| `primary.dk` | `#00CC7E` | Hover/pressed primary |
| `primary.light` | `#5CFFBE` | Tinted surfaces |
| `primary.glow` | `#00FF9D` | Glow utility source |
| `primary.fg` | `#060B10` | Text on jade-filled surfaces |
| `bg` | `#060B10` | App background |
| `surface` | `#0D151E` | Cards / panels |
| `input` | `#0A1017` | Form input background |
| `border-jade` | `rgba(0,255,157,0.2)` | Default jade border |

#### Scenario: Token list matches spec
- GIVEN `tailwind.config.ts`
- WHEN read
- THEN every hex in the table above MUST appear exactly, with no rounding

### Requirement: Color tokens — semantic and text

The system SHALL expose the following semantic and text tokens:

| Token | Value | Role |
|-------|-------|------|
| `info` | `#00B8FF` | Secondary cyan, AI-viz, informational chrome |
| `danger` / `loss` | `#FF2A55` | Errors, negative P&L (with neon glow variant) |
| `profit` | `#35D07F` | Positive P&L (solid only, see glow restriction) |
| `text.primary` | `#E0E6ED` | Primary copy |
| `text.secondary` | `#8A9BA8` | Secondary copy |

#### Scenario: info token is cyan-secondary
- GIVEN the `info` token
- WHEN used for AI-viz, badges, or info banners
- THEN its computed value MUST equal `#00B8FF`

### Requirement: Glow restriction — chrome only

Glow utilities (`shadow-glow-jade-sm`, `shadow-glow-jade-md`, `text-shadow-glow-jade`) MUST be applied only to chrome (logos, primary buttons, sidebar active items, badges, status dots). They MUST NOT be applied to numeric cells in data tables, P&L values, balance cells, or any value rendered in a data-dense surface.

#### Scenario: Glow on chrome
- GIVEN a primary `<Button>` rendered
- WHEN hovered
- THEN `shadow-glow-jade-md` SHALL be applied

#### Scenario: Glow forbidden on numeric P&L
- GIVEN a `<DataTable>` cell containing a negative trade value
- WHEN rendered
- THEN it MUST use `font-mono` and `text-loss` with NO `shadow-*` and NO `text-gradient-*`

### Requirement: Typography stack

The system SHALL expose:

| Stack | Order |
|-------|-------|
| `fontFamily.display` | `Orbitron`, `Rajdhani`, `Space Grotesk`, fallback sans |
| `fontFamily.body` | `Inter`, fallback sans |
| `fontFamily.mono` | `JetBrains Mono`, fallback mono (numbers in tables) |

`@fontsource/rajdhani` and `@fontsource/space-grotesk` MUST be added as dev dependencies. Fonts MUST be self-hosted with `font-display: swap` and Latin-subset.

#### Scenario: Display text uses stack
- GIVEN a heading or hero number
- WHEN rendered
- THEN the computed `font-family` MUST start with `Orbitron`

### Requirement: Glassmorphism and surface utilities

The system SHALL expose `bg-surface/80`, `backdrop-blur-glass`, and a chamfered-corners utility (`clip-path-chamfer`) available to card components. Glassmorphism is reserved for `surface`-based cards/panels; it MUST NOT be applied to data tables or form inputs.

#### Scenario: Card uses glass
- GIVEN a `<Card>` primitive
- WHEN rendered
- THEN its background MUST be `bg-surface/80` with `backdrop-blur-glass`

## Dependencies

- `tailwind.config.ts`
- `src/styles/index.css`
- All primitives defined in `primitive-library`

## Out of scope

- Light theme variants (dark-first is binding for FASE 1).
- Per-component color tokens beyond the table above.
- Accessibility contrast audit beyond the focus-ring requirement.
