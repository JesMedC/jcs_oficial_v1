/*
 * Cyber-Jade — BullBearMesh.
 *
 * Decorative background inspired by trading-floor symbolism: a wireframe
 * BULL (left, jade-bright = bull market = upside) facing a wireframe
 * BEAR (right, deep-jade / crimson-shifted = bear market = downside).
 * Both figures are drawn as low-poly SVG silhouettes with a triangular
 * mesh overlay, glow halos, and a vertical light beam splitting the
 * canvas (cyan-tinged jade).
 *
 * Layers (back to front):
 *   1. Vertical jade light beam (radial gradient, behind figures)
 *   2. Bull silhouette (jade gradient fill + glow)
 *   3. Bear silhouette (jade-dk gradient fill + crimson glow)
 *   4. Triangular mesh overlay on both (deterministic low-poly)
 *   5. Floating data labels (EUR/USD, BTC, P&L, etc.) — small caps
 *      Orbitron + JetBrains Mono with jade/green glow
 *
 * Animations: subtle rotation + drift + glow pulse. All CSS-driven.
 * Pointer-events-none, aria-hidden, z-0 (under content).
 *
 * Determinism: every polygon's position is seeded, so the mesh is
 * stable across renders. No flickering on hot reload.
 */
import { useMemo } from 'react';

export interface BullBearMeshProps {
  readonly className?: string;
}

/* ---------------- Seeded PRNG (mulberry32) ---------------- */

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Low-poly mesh helper ---------------- */

interface Triangle {
  readonly d: string;
  readonly opacity: number;
}

function buildMeshTriangles(
  /** ViewBox-relative polygon defining the silhouette. */
  silhouette: ReadonlyArray<readonly [number, number]>,
  /** Triangulation density (avg side length, in viewBox units). */
  cellSize: number,
  seed: number,
): Triangle[] {
  // 1. Compute the bounding box of the silhouette.
  const xs = silhouette.map((p) => p[0]);
  const ys = silhouette.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // 2. Build a regular grid of points inside the bbox, plus a few
  //    jittered interior points for organic look.
  const rng = makeRng(seed);
  const points: [number, number][] = [];
  for (let y = minY; y <= maxY; y += cellSize) {
    for (let x = minX; x <= maxX; x += cellSize) {
      const jitter = rng() * cellSize * 0.4;
      points.push([x + jitter, y + jitter]);
    }
  }

  // 3. Point-in-polygon test (ray casting).
  function inPoly(px: number, py: number): boolean {
    let inside = false;
    for (let i = 0, j = silhouette.length - 1; i < silhouette.length; j = i++) {
      const xi = silhouette[i]![0];
      const yi = silhouette[i]![1];
      const xj = silhouette[j]![0];
      const yj = silhouette[j]![1];
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // 4. Triangulate interior points using a simple two-pass grid pattern
  //    (each cell becomes 2 triangles). Faster than Delaunay and gives
  //    the low-poly look the reference image has.
  const triangles: Triangle[] = [];
  const stepX = cellSize;
  const stepY = cellSize * 0.85;
  for (let y = minY; y < maxY; y += stepY) {
    const flip = (Math.floor((y - minY) / stepY) % 2) === 0;
    for (let x = minX; x < maxX; x += stepX) {
      const ax = x + (flip ? 0 : stepX / 2);
      const ay = y;
      const bx = x + stepX;
      const by_ = y;
      const cx = x + stepX / 2;
      const cy = y + stepY;
      const dx = x + (flip ? stepX : 0);
      const dy = y + stepY;
      const c0: [number, number] = [ax, ay];
      const c1: [number, number] = [bx, by_];
      const c2: [number, number] = [cx, cy];
      const c3: [number, number] = [dx, dy];
      // For each of the 3 triangles in the quad, only keep if all 3
      // vertices are inside the polygon.
      const tris: ReadonlyArray<[number, number][]> = [
        [c0, c1, c2],
        [c1, c3, c2],
        [c0, c2, c3],
        [c0, c3, c1],
      ];
      for (const tri of tris) {
        if (tri.every((p) => inPoly(p[0], p[1]))) {
          const r = rng();
          const opacity = 0.18 + r * 0.55;
          const d = `M ${tri[0]![0].toFixed(1)} ${tri[0]![1].toFixed(1)} L ${tri[1]![0].toFixed(1)} ${tri[1]![1].toFixed(1)} L ${tri[2]![0].toFixed(1)} ${tri[2]![1].toFixed(1)} Z`;
          triangles.push({ d, opacity });
        }
      }
    }
  }
  // Render cap to keep the mesh light.
  return triangles.slice(0, 360);
}

/* ---------------- Silhouettes (hand-tuned low-poly) ----------------
 * ViewBox is 1000 wide × 360 tall. These are abstract silhouettes —
 * not anatomically perfect, but recognisable as bull / bear.
 */

const BULL: ReadonlyArray<readonly [number, number]> = [
  // Top of head, horns, back, tail, belly, legs
  [60, 200], // tail base
  [80, 170],
  [120, 175],
  [150, 155],
  [180, 130],
  [200, 110],
  [225, 95], // forehead
  [255, 90],
  [285, 95], // horn right
  [300, 75],
  [320, 85],
  [345, 100],
  [370, 120], // horn left
  [385, 110],
  [400, 130],
  [415, 170], // shoulder hump
  [430, 195], // back
  [445, 220], // rear
  [460, 245],
  [475, 270], // rear haunch
  [475, 320], // rear leg bottom
  [445, 325],
  [445, 290],
  [415, 295], // belly
  [415, 325],
  [385, 325],
  [385, 280],
  [355, 285], // front leg
  [355, 325],
  [325, 325],
  [325, 270],
  [295, 260],
  [255, 250],
  [220, 240],
  [180, 225],
  [140, 215],
  [100, 210],
];

const BEAR: ReadonlyArray<readonly [number, number]> = [
  // Bear facing left, mirrored shape
  [540, 200],
  [560, 175],
  [600, 165],
  [630, 145],
  [660, 125], // head
  [685, 115],
  [710, 120],
  [730, 140],
  [745, 165], // ear hump
  [760, 150],
  [780, 165],
  [795, 190],
  [810, 220], // shoulder
  [830, 245],
  [850, 270],
  [870, 295],
  [880, 325], // rear leg
  [850, 325],
  [850, 295],
  [820, 300],
  [820, 325],
  [790, 325],
  [790, 285],
  [760, 275],
  [725, 265], // belly
  [695, 270],
  [665, 275],
  [640, 275], // front leg
  [640, 325],
  [610, 325],
  [610, 285],
  [580, 270],
  [555, 250],
  [535, 225],
];

/* ---------------- Floating data labels ---------------- */

const FLOATING_LABELS: ReadonlyArray<{
  text: string;
  value: string;
  x: number;
  y: number;
  drift: number;
  speed: number;
  delay: number;
  sign: 'up' | 'down' | 'neutral';
}> = [
  { text: 'BULL', value: '+2.4%', x: 8, y: 20, drift: 14, speed: 18, delay: 0, sign: 'up' },
  { text: 'EUR/USD', value: '1.0843', x: 18, y: 80, drift: 10, speed: 22, delay: -3, sign: 'up' },
  { text: 'GOLD', value: '2,341.18', x: 6, y: 55, drift: 12, speed: 24, delay: -8, sign: 'up' },
  { text: 'P&L', value: '+$1,284', x: 26, y: 12, drift: 8, speed: 20, delay: -5, sign: 'up' },
  { text: 'BEAR', value: '-1.8%', x: 78, y: 70, drift: 14, speed: 20, delay: -2, sign: 'down' },
  { text: 'BTC/USD', value: '67,840.5', x: 84, y: 24, drift: 10, speed: 26, delay: -9, sign: 'down' },
  { text: 'OIL', value: '-0.92%', x: 90, y: 50, drift: 12, speed: 22, delay: -6, sign: 'down' },
  { text: 'VIX', value: '14.22', x: 72, y: 88, drift: 8, speed: 18, delay: -4, sign: 'neutral' },
];

function FloatingLabels() {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-60">
      {FLOATING_LABELS.map((l, i) => {
        const colorClass =
          l.sign === 'up'
            ? 'text-[#35D07F]'
            : l.sign === 'down'
              ? 'text-[#FF2A55]'
              : 'text-text-muted';
        return (
          <div
            key={i}
            className="absolute flex items-baseline gap-2 whitespace-nowrap"
            style={{
              top: `${l.y}%`,
              left: `${l.x}%`,
              animation: `label-drift ${l.speed}s ease-in-out infinite alternate, label-pulse 4s ease-in-out infinite`,
              animationDelay: `${l.delay}s, ${-l.delay / 2}s`,
            }}
          >
            <span
              className="font-display uppercase tracking-wider text-[9px] md:text-[10px] text-primary"
              style={{ textShadow: '0 0 3px rgba(0,255,157,0.4)' }}
            >
              {l.text}
            </span>
            <span
              className={`font-mono text-[10px] md:text-xs ${colorClass}`}
              style={{ textShadow: '0 0 3px currentColor' }}
            >
              {l.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Mesh figure ---------------- */

function Figure({
  silhouette,
  fillId,
  stroke,
  meshSeed,
  flip = false,
  glowColor,
}: {
  silhouette: ReadonlyArray<readonly [number, number]>;
  fillId: string;
  stroke: string;
  meshSeed: number;
  flip?: boolean;
  glowColor: string;
}) {
  const triangles = useMemo(
    () => buildMeshTriangles(silhouette, 22, meshSeed),
    [silhouette, meshSeed],
  );

  return (
    <g transform={flip ? 'translate(1000 0) scale(-1 1)' : undefined}>
      {/* Outer glow halo — subtle, so the figure sits in the deep
          background and doesn't compete with foreground content. */}
      <ellipse
        cx={silhouette.reduce((acc, p) => acc + p[0], 0) / silhouette.length}
        cy={silhouette.reduce((acc, p) => acc + p[1], 0) / silhouette.length + 30}
        rx={silhouette.length * 1.1}
        ry={silhouette.length * 0.9}
        fill={`url(#${fillId}-glow)`}
        opacity={0.22}
      />
      {/* Silhouette fill — soft jade gradient, no heavy drop-shadow so
          the figures read as ambient background. */}
      <path
        d={`M ${silhouette.map((p) => `${p[0]} ${p[1]}`).join(' L ')} Z`}
        fill={`url(#${fillId})`}
        stroke={stroke}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeOpacity={0.85}
        style={{
          filter: `drop-shadow(0 0 6px ${glowColor})`,
        }}
      />
      {/* Triangular mesh overlay — darker so it doesn't draw the eye */}
      <g style={{ mixBlendMode: 'screen' }}>
        {triangles.map((t, i) => (
          <path
            key={i}
            d={t.d}
            fill={stroke}
            opacity={t.opacity * 0.32}
            stroke={stroke}
            strokeWidth={0.4}
            strokeOpacity={0.45}
          />
        ))}
      </g>
      {/* Faint outline highlight (rim light) */}
      <path
        d={`M ${silhouette.map((p) => `${p[0]} ${p[1]}`).join(' L ')} Z`}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.06}
        strokeWidth={0.8}
      />
    </g>
  );
}

/* ---------------- Beam (vertical light strip behind the figures) ---------------- */

function LightBeam() {
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id="beam-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,255,157,0)" />
          <stop offset="50%" stopColor="rgba(0,255,157,0.08)" />
          <stop offset="100%" stopColor="rgba(0,255,157,0)" />
        </linearGradient>
      </defs>
      <rect x={460} y={0} width={80} height={360} fill="url(#beam-v)" opacity={0.4} />
    </g>
  );
}

/* ---------------- Public component ---------------- */

export function BullBearMesh({ className }: BullBearMeshProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        // fixed inset-0 keeps the figures visible behind the content
        // even on long pages — they don't scroll away with the rest of
        // the page. pointer-events-none + z-0 + opacity-35 puts them
        // firmly in the deep background.
        'fixed inset-0 overflow-hidden pointer-events-none opacity-35',
        className ?? '',
      ].join(' ')}
      style={{ zIndex: 0 }}
    >
      {/* Deep abyssal radial wash — subtle, just to soften the abyssal
          colour near the center where the figures sit. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,255,157,0.05), transparent 70%), radial-gradient(ellipse 50% 40% at 25% 55%, rgba(0,255,157,0.03), transparent 70%), radial-gradient(ellipse 50% 40% at 75% 55%, rgba(0,184,255,0.02), transparent 70%)',
        }}
      />

      {/* The SVG scene — viewBox sized to the actual silhouettes so the
          two figures stay balanced in the centre of the viewport across
          aspect ratios. preserveAspectRatio="xMidYMid meet" shows the
          full scene; on tall viewports there will be some breathing
          room top/bottom which the vignette absorbs. */}
      <svg
        viewBox="0 0 1000 280"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        style={{ animation: 'mesh-breath 12s ease-in-out infinite' }}
      >
        <defs>
          {/* Bull fill — bright jade top to deep jade bottom */}
          <linearGradient id="bull-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,255,157,0.30)" />
            <stop offset="100%" stopColor="rgba(0,120,90,0.12)" />
          </linearGradient>
          <radialGradient id="bull-fill-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,255,157,0.22)" />
            <stop offset="100%" stopColor="rgba(0,255,157,0)" />
          </radialGradient>
          {/* Bear fill — deeper jade with crimson rim */}
          <linearGradient id="bear-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(53,208,127,0.25)" />
            <stop offset="100%" stopColor="rgba(20,90,60,0.12)" />
          </linearGradient>
          <radialGradient id="bear-fill-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(53,208,127,0.18)" />
            <stop offset="100%" stopColor="rgba(53,208,127,0)" />
          </radialGradient>
        </defs>

        <LightBeam />

        {/* Bull drifts left slowly, Bear drifts right — opposing motion
            reads as "market tension". Both figures also breathe opacity. */}
        <g style={{ animation: 'figure-drift-bull 18s ease-in-out infinite alternate, mesh-breath 8s ease-in-out infinite' }}>
          <Figure
            silhouette={BULL}
            fillId="bull-fill"
            stroke="#00FF9D"
            meshSeed={42}
            glowColor="rgba(0,255,157,0.5)"
          />
        </g>
        <g style={{ animation: 'figure-drift-bear 18s ease-in-out infinite alternate, mesh-breath 8s ease-in-out infinite reverse' }}>
          <Figure
            silhouette={BEAR}
            fillId="bear-fill"
            stroke="#35D07F"
            meshSeed={137}
            flip
            glowColor="rgba(53,208,127,0.4)"
          />
        </g>

        {/* Animated rim highlight around the meeting line — subdued.
            The dashed offset travels upward so the line "scans" the
            divide between bull and bear territories. */}
        <line
          x1={500}
          y1={0}
          x2={500}
          y2={270}
          stroke="rgba(0,255,157,0.22)"
          strokeWidth={0.8}
          strokeDasharray="4 8"
          style={{
            animation: 'beam-shimmer 3s linear infinite',
          }}
        />
      </svg>

      {/* Floating data labels on top of the figures */}
      <FloatingLabels />

      {/* Ground lines (separate from the SVG so they cover the full
          viewport width regardless of viewBox aspect) */}
      <GroundFullWidth />

      {/* Heavy vignette so the figures sit in the deep background and
          the foreground content (cards, headlines) stays the hero. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(6,11,16,0.45) 0%, rgba(6,11,16,0.85) 75%, #060B10 100%)',
        }}
      />
    </div>
  );
}

/* ---------------- Ground lines (full-width, viewBox-independent) ---------------- */

function GroundFullWidth() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 pointer-events-none opacity-30"
      style={{ height: '60px' }}
    >
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {Array.from({ length: 6 }, (_, i) => i).map((i) => (
          <line
            key={i}
            x1={0}
            y1={i * 10}
            x2={1440}
            y2={i * 10}
            stroke="rgba(0,255,157,0.18)"
            strokeWidth={0.5}
            opacity={1 - i * 0.18}
            style={{
              animation: `grid-pulse ${4 + i * 0.6}s ease-in-out infinite`,
              animationDelay: `-${i * 0.4}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
