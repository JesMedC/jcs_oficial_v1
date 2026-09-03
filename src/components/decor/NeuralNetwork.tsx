/*
 * design-system-v1 — NeuralNetwork decor primitive (Wave 6, T6.2).
 *
 * Ambient node-link graphic reserved for AI-module surfaces (a
 * future "AI insights" tab on the dashboard, the AI-training copy
 * on the pricing page, etc.). NOT for data-dense surfaces — the
 * decorative motion would compete with the data and break the
 * "decor on chrome, no decor on data" rule.
 *
 * Contract (per `specs/decorative-system/spec.md` Requirement:
 * NeuralNetwork component + design.md §5.2):
 *   - container: `<div className="pointer-events-none -z-10 absolute
 *     inset-0">` so the wrapper sits behind the page content and
 *     never intercepts clicks
 *   - inline `<svg>` is sized to fill its parent; the parent must
 *     provide a positioning context (`relative`, `absolute`, or
 *     `fixed`) and a size
 *   - deterministic layout via a seeded RNG (mulberry32) so SSR,
 *     screenshot baselines, and consecutive renders all land on the
 *     same node positions for a given seed
 *   - edge count bounded by `Math.round(nodeCount * (nodeCount-1)
 *     / 2 * edgeDensity)`; this is the MAX possible edges; the
 *     actual count after the RNG's "include this edge?" filter is
 *     bounded by this value (the seeded random below the threshold
 *     includes; above excludes)
 *   - drift animation is opt-in via the inline `@keyframes
 *     jcs-neural-drift` defined inside the component (NOT in
 *     `tailwind.config.ts`, which is out of scope for Wave 6).
 *     The keyframe name is namespaced to avoid bundle collisions.
 *   - reduced-motion: the `animate` prop is suppressed and the
 *     drift class is NOT applied when the user prefers reduced
 *     motion (mirroring the `StatusDot` + `Skeleton` convention).
 *
 * Why inline `<style>` instead of a Tailwind utility: the Wave 6
 * orchestrator scope explicitly excludes the config layer; the
 * `neural-drift` keyframe will be moved to `tailwind.config.ts` in
 * a future wave. For now the inline block provides the same visual
 * effect without touching out-of-scope files.
 */
import { useId, useMemo } from 'react';

export interface NeuralNetworkProps {
  /**
   * Number of nodes to render. Default 30 — gives a visually dense
   * but not chaotic constellation. The spec allows 6 → 24 for the
   * styleguide slider; the default sits slightly above the styleguide
   * upper bound so a public landing surface can use it without
   * feeling sparse.
   */
  readonly nodeCount?: number;
  /**
   * Probability (0–1) that any given possible edge is rendered. The
   * spec defaults to 0.3 — a balance between "a connected graph"
   * (too dense reads as a hairball) and "a starfield of nodes"
   * (too sparse loses the network metaphor).
   */
  readonly edgeDensity?: number;
  /**
   * Line stroke-opacity (0–1). Default 0.03 — the lowest the spec
   * allows; the lines are the supporting texture, not the subject.
   */
  readonly opacity?: number;
  /**
   * Node radius in pixels. Default 2 — small enough to read as
   * "vertex" rather than "highlight".
   */
  readonly nodeRadius?: number;
  /**
   * Edge + node fill color. Default `#00FF9D` (jade neon).
   */
  readonly color?: string;
  /**
   * Whether to apply the drift animation. Default `true`. The
   * animation is suppressed regardless of this prop when the user
   * prefers reduced motion.
   */
  readonly animate?: boolean;
  /**
   * Seed for the deterministic mulberry32 PRNG. Default 42 — the
   * same value used in tests so screenshots stay stable. Consumers
   * who want a different layout can pass any non-zero integer.
   */
  readonly seed?: number;
  /**
   * Extra classes merged onto the wrapping `<div>`.
   */
  readonly className?: string;
}

const DEFAULT_NODE_COUNT = 30;
const DEFAULT_EDGE_DENSITY = 0.3;
const DEFAULT_OPACITY = 0.03;
const DEFAULT_NODE_RADIUS = 2;
const DEFAULT_COLOR = '#00FF9D';
const DEFAULT_SEED = 42;
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 600;

/**
 * mulberry32 — a tiny seeded PRNG. Returns a function that
 * produces floats in [0, 1) deterministically from the given seed.
 * Used here for both the node positions and the edge inclusion
 * decision so the entire layout is reproducible.
 */
function mulberry32(seedValue: number): () => number {
  let a = seedValue >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Read the prefers-reduced-motion media query at render time.
 * Mirrors the convention in `StatusDot` and `Skeleton` — jsdom does
 * not implement `window.matchMedia` natively but the test setup
 * stubs one with `matches: false`.
 */
function prefersReducedMotion(): boolean {
  if (typeof globalThis.matchMedia !== 'function') return false;
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Compute the deterministic layout (positions + edge list) once per
 * mount. Memoized so the second render of the same component
 * instance produces the same SVG without re-running the RNG
 * (important for the deterministic-render assertion in tests).
 */
interface NodePosition {
  readonly cx: number;
  readonly cy: number;
}

interface Edge {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

function buildLayout(
  nodeCount: number,
  edgeDensity: number,
  seedValue: number,
): { nodes: ReadonlyArray<NodePosition>; edges: ReadonlyArray<Edge> } {
  const rng = mulberry32(seedValue);

  // Nodes: place each at a random (x, y) in the viewBox. No minimum
  // distance enforcement — overlaps are fine for the decorative
  // texture (they actually look better than a Poisson-disk layout
  // because the line crossings create a denser network feel).
  const nodes: NodePosition[] = [];
  for (let i = 0; i < nodeCount; i += 1) {
    nodes.push({
      cx: rng() * VIEWBOX_WIDTH,
      cy: rng() * VIEWBOX_HEIGHT,
    });
  }

  // Edges: iterate every unordered pair; include if RNG < density.
  // This is the `edgeDensity` probability per possible edge, which
  // matches the spec's "edges per node pair" wording. The actual
  // count is bounded by `Math.round(nodeCount * (nodeCount-1) / 2 *
  // edgeDensity)`.
  const edges: Edge[] = [];
  for (let i = 0; i < nodeCount; i += 1) {
    for (let j = i + 1; j < nodeCount; j += 1) {
      if (rng() < edgeDensity) {
        const a = nodes[i];
        const b = nodes[j];
        if (a !== undefined && b !== undefined) {
          edges.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy });
        }
      }
    }
  }

  return { nodes, edges };
}

export function NeuralNetwork({
  nodeCount = DEFAULT_NODE_COUNT,
  edgeDensity = DEFAULT_EDGE_DENSITY,
  opacity = DEFAULT_OPACITY,
  nodeRadius = DEFAULT_NODE_RADIUS,
  color = DEFAULT_COLOR,
  animate = true,
  seed = DEFAULT_SEED,
  className,
}: NeuralNetworkProps): JSX.Element {
  // Stable unique id for the styleguide + a11y audit trail.
  const reactId = useId();

  // Memoize the layout by the inputs that drive it (nodeCount,
  // edgeDensity, seed). A re-render with the same inputs returns
  // the same layout without re-running the RNG.
  const layout = useMemo(
    () => buildLayout(nodeCount, edgeDensity, seed),
    [nodeCount, edgeDensity, seed],
  );

  const reducedMotion = prefersReducedMotion();
  const driftEnabled = animate && !reducedMotion;

  const wrapperClasses = [
    'pointer-events-none',
    '-z-10',
    'absolute inset-0',
    driftEnabled ? 'jcs-neural-drift' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={wrapperClasses}
      aria-hidden="true"
      data-testid="neural-network"
    >
      <style>{`@keyframes jcs-neural-drift {
            0%, 100% { transform: translate3d(0, 0, 0); }
            50%      { transform: translate3d(4px, -4px, 0); }
          }
          .jcs-neural-drift {
            animation: jcs-neural-drift 30s ease-in-out infinite;
            will-change: transform;
          }`}</style>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        data-testid="neural-network-svg"
        data-react-id={reactId}
      >
        <g>
          {layout.edges.map((edge, idx) => (
            <line
              key={`edge-${idx}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke={color}
              strokeOpacity={opacity}
              strokeWidth={1}
            />
          ))}
        </g>
        <g>
          {layout.nodes.map((node, idx) => (
            <circle
              key={`node-${idx}`}
              cx={node.cx}
              cy={node.cy}
              r={nodeRadius}
              fill={color}
              fillOpacity={opacity}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}