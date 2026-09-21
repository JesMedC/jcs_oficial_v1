/*
 * Cyber-Jade — NeuralMesh.
 *
 * Decorative background inspired by the AI / cyber-trading aesthetic:
 * a dense node-link graph spread across the whole viewport, jade
 * neon with glowing vertices, drifting animation, and depth via
 * per-node opacity tiers (foreground / midground / background).
 *
 * Layers (back to front):
 *   1. Deep abyssal radial wash (jade) — anchors the composition.
 *   2. Background tier — 30 dim nodes, low opacity, slow drift.
 *   3. Midground tier — 24 medium nodes, brighter, opposite drift.
 *   4. Foreground tier — 12 bright nodes with strong glow halos.
 *   5. Edges — only within each tier (no cross-tier), so the network
 *      feels like three constellations at different depths.
 *   6. Heavy vignette so the foreground content stays the hero.
 *
 * All decorative: aria-hidden, pointer-events-none, z-0. The wrapper
 * is `fixed inset-0` so the mesh stays put while the user scrolls.
 *
 * Determinism: every position comes from a seeded mulberry32 PRNG, so
 * the layout is stable across renders / SSR / hot reload.
 */
import { useId, useMemo } from 'react';

export interface NeuralMeshProps {
  readonly className?: string;
  /** Overall opacity multiplier (0..1). Default 0.55 — leaves room for
   *  the vignette to finish pushing the mesh into the background. */
  readonly opacity?: number;
}

interface Node {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly tier: 1 | 2 | 3;
}

interface Edge {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly tier: 1 | 2 | 3;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TierSpec {
  readonly count: number;
  readonly radiusRange: readonly [number, number];
  readonly edgeDensity: number;
  readonly color: string;
  readonly strokeOpacity: number;
  readonly fillOpacity: number;
  readonly glow: number;
}

const TIERS: readonly TierSpec[] = [
  // Background — many dim nodes, sparse edges, cool jade
  {
    count: 60,
    radiusRange: [1.2, 2.4],
    edgeDensity: 0.10,
    color: '#00FF9D',
    strokeOpacity: 0.22,
    fillOpacity: 0.55,
    glow: 2,
  },
  // Midground — fewer brighter nodes, denser edges
  {
    count: 36,
    radiusRange: [2.0, 3.6],
    edgeDensity: 0.18,
    color: '#00FF9D',
    strokeOpacity: 0.42,
    fillOpacity: 0.85,
    glow: 5,
  },
  // Foreground — sparse hero nodes with strong halo
  {
    count: 14,
    radiusRange: [3.0, 5.0],
    edgeDensity: 0.30,
    color: '#5CFFBE',
    strokeOpacity: 0.65,
    fillOpacity: 1,
    glow: 10,
  },
];

const VIEWBOX_W = 1600;
const VIEWBOX_H = 900;

interface Tier {
  readonly nodes: ReadonlyArray<Node>;
  readonly edges: ReadonlyArray<Edge>;
  readonly spec: TierSpec;
  readonly tier: 1 | 2 | 3;
}

function buildTier(spec: TierSpec, seed: number, tier: 1 | 2 | 3): Tier {
  const rng = mulberry32(seed);
  const nodes: Node[] = [];
  for (let i = 0; i < spec.count; i += 1) {
    const r =
      spec.radiusRange[0] +
      rng() * (spec.radiusRange[1] - spec.radiusRange[0]);
    nodes.push({
      cx: rng() * VIEWBOX_W,
      cy: rng() * VIEWBOX_H,
      r,
      tier,
    });
  }
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (rng() < spec.edgeDensity) {
        const a = nodes[i];
        const b = nodes[j];
        if (a !== undefined && b !== undefined) {
          edges.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, tier });
        }
      }
    }
  }
  return { nodes, edges, spec, tier };
}

export function NeuralMesh({ className, opacity = 0.55 }: NeuralMeshProps): JSX.Element {
  const reactId = useId();
  const tiers = useMemo(
    () => [
      buildTier(TIERS[0]!, 17, 1),
      buildTier(TIERS[1]!, 91, 2),
      buildTier(TIERS[2]!, 233, 3),
    ],
    [],
  );

  return (
    <div
      aria-hidden="true"
      data-testid="neural-mesh"
      data-react-id={reactId}
      className={[
        // fixed inset-0 keeps the mesh visible behind every section
        // regardless of scroll position. pointer-events-none + opacity
        // + vignette keep it firmly in the background.
        'fixed inset-0 overflow-hidden pointer-events-none',
        className ?? '',
      ].join(' ')}
      style={{ zIndex: 0, opacity }}
    >
      {/* Deep abyssal radial wash — softens abyssal with a jade tint. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 55%, rgba(0,255,157,0.06), transparent 75%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(0,255,157,0.04), transparent 70%), radial-gradient(ellipse 60% 50% at 80% 30%, rgba(0,184,255,0.03), transparent 70%)',
        }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Drift wrapper — slow translate so the whole constellation
            breathes (this matches the reference image where the mesh
            feels alive but not distracting). */}
        <g style={{ animation: 'mesh-drift 60s ease-in-out infinite alternate' }}>
          {tiers.map((tier) => (
            <g
              key={`tier-${tier.spec.glow}`}
              style={{
                // Foreground tier gets a slightly faster pulse; back
                // tier barely moves. Achieved via per-tier animation.
                animation: `mesh-pulse-${tier.spec.glow} ${
                  6 + tier.spec.glow
                }s ease-in-out infinite`,
              }}
            >
              {/* Edges */}
              <g>
                {tier.edges.map((edge, idx) => (
                  <line
                    key={`e-${tier.spec.glow}-${idx}`}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={tier.spec.color}
                    strokeOpacity={tier.spec.strokeOpacity}
                    strokeWidth={tier.tier === 3 ? 1.4 : 1}
                  />
                ))}
              </g>
              {/* Nodes — outer halo + inner dot */}
              <g>
                {tier.nodes.map((node, idx) => (
                  <g key={`n-${tier.spec.glow}-${idx}`}>
                    {tier.tier === 3 ? (
                      // Foreground tier — extra outer halo for that
                      // "glowing star" look the reference has.
                      <circle
                        cx={node.cx}
                        cy={node.cy}
                        r={node.r * tier.spec.glow * 0.5}
                        fill={tier.spec.color}
                        fillOpacity={0.06}
                      />
                    ) : null}
                    <circle
                      cx={node.cx}
                      cy={node.cy}
                      r={node.r * 1.8}
                      fill={tier.spec.color}
                      fillOpacity={tier.spec.fillOpacity * 0.25}
                    />
                    <circle
                      cx={node.cx}
                      cy={node.cy}
                      r={node.r}
                      fill={tier.spec.color}
                      fillOpacity={tier.spec.fillOpacity}
                    />
                  </g>
                ))}
              </g>
            </g>
          ))}
        </g>
      </svg>

      {/* Heavy vignette so the mesh sits in the deep background. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(6,11,16,0.40) 0%, rgba(6,11,16,0.85) 75%, #060B10 100%)',
        }}
      />
    </div>
  );
}
