# Spec: decorative-system

## Purpose

Define the ambient decorative graphics shipped under `src/components/decor/`: a jade dot-grid backdrop, a neural-network node-link graphic reserved for AI modules, and the `statusDotPulse` keyframe used by `<StatusDot>`. These assets must reinforce the Cyber-Jade language without competing with data.

## Requirements

### Requirement: DotGrid component

`<DotGrid>` SHALL render an inline SVG with a square grid of jade dots at 3–5% opacity. The grid MUST accept `spacing` (default 24px), `dotRadius` (default 1.5px), `opacity` (default 0.04), and `className`. It MUST be a presentational, server-safe component (no `useEffect`).

#### Scenario: Defaults applied
- GIVEN `<DotGrid />` rendered at the page root
- WHEN inspected
- THEN spacing MUST equal 24px, dot radius MUST equal 1.5px, opacity MUST equal 0.04

#### Scenario: Custom opacity
- GIVEN `<DotGrid opacity={0.05} />`
- WHEN rendered
- THEN the `fill-opacity` MUST equal 0.05

### Requirement: NeuralNetwork component

`<NeuralNetwork>` SHALL render an SVG node-link graphic reserved for AI-module surfaces. It MUST accept `nodes` (default 12), `density` (default 0.3 edges per node pair), and `animate` (`'drift' | 'static'`, default `'drift'`). When `animate="drift"`, nodes MUST translate ±4px on the X/Y axes with a 12s ease-in-out loop; reduced-motion users MUST receive the `static` rendering regardless of the prop.

#### Scenario: Reduced motion honored
- GIVEN a user with `prefers-reduced-motion: reduce`
- WHEN `<NeuralNetwork />` mounts
- THEN the rendered SVG MUST NOT animate

#### Scenario: Node density bounded
- GIVEN `<NeuralNetwork nodes={20} density={0.5} />`
- WHEN rendered
- THEN the rendered edge count MUST NOT exceed `nodes * (nodes-1) / 2 * density` (rounded)

### Requirement: statusDotPulse keyframe

The system SHALL expose a `statusDotPulse` keyframe in `tailwind.config.ts` with timing 1.5s `ease-in-out` infinite, opacity range 0.5 → 1.0 → 0.5, and a paired utility `animate-status-dot-pulse`. The keyframe MUST accept the four documented colors (`jade`, `cyan`, `red`, `amber`) via a parameterized shadow utility.

#### Scenario: Animation duration matches
- GIVEN `<StatusDot color="jade" pulse />`
- WHEN the animation runs
- THEN a single cycle MUST complete in 1.5s

#### Scenario: Color variants swap glow
- GIVEN a `<StatusDot color="red" pulse />`
- WHEN rendered
- THEN the pulse halo MUST use the red semantic color, not jade

## Dependencies

- `cyber-jade-tokens` (for hex values and animation timing tokens)
- `primitive-library` (consumes `statusDotPulse` via `<StatusDot>`)

## Out of scope

- Animated backgrounds for data-dense surfaces (forbidden — see `cyber-jade-tokens` glow restriction).
- Interactive decorative surfaces (decorative assets are presentational only).
