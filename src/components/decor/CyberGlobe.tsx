/*
 * Cyber-Jade — CyberGlobe.
 *
 * Animated decorative background inspired by Bloomberg-terminal /
 * cyber-trading dashboards. Composes four layers (back to front):
 *
 *   1. Deep abyssal radial glow (jade) — anchors the composition.
 *   2. Wireframe globe — sphere with latitude/longitude mesh, slow
 *      rotation around the Y axis. Drawn as pure inline SVG so the
 *      glow filter can ride along the same coordinate system.
 *   3. Candlesticks — vertical green/red bars representing price
 *      ticks; each bar pulses opacity to simulate tick activity.
 *   4. Bloomberg-style price labels — Orbitron-monospace numbers
 *      that drift horizontally across the layer.
 *
 * The whole component is purely decorative: `pointer-events-none`,
 * `aria-hidden`, sits behind the actual UI (`z-0`). Animation is
 * CSS-driven (transform + opacity keyframes) so it costs ~nothing
 * per frame — no JS animation loop.
 *
 * Performance: SVG with ~400 nodes total. Renders once, animates via
 * GPU compositor. We deliberately skip a real WebGL globe because:
 *   - we don't need depth-of-field shading
 *   - we want CSS animations for `prefers-reduced-motion`
 *   - we want to ship in <2kB gzipped
 */
import type { CSSProperties } from 'react';

export interface CyberGlobeProps {
  readonly className?: string;
  readonly style?: CSSProperties;
  /** 0..1 — opacity multiplier for the whole composition. */
  readonly opacity?: number;
}

/* ---------- Globe helpers (deterministic) ---------- */

/**
 * Generate `count` (lat, lon) points roughly evenly distributed on a
 * sphere using a Fibonacci lattice. Same seed → same dots, so the
 * globe is stable across renders.
 */
function fibonacciSphere(count: number): ReadonlyArray<{ lat: number; lon: number }> {
  const points: { lat: number; lon: number }[] = [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    // lat -90..90, lon -180..180
    const lat = Math.asin(y) * (180 / Math.PI);
    const lon = Math.atan2(z, x) * (180 / Math.PI);
    points.push({ lat, lon });
  }
  return points;
}

/**
 * Project a (lat, lon) on a unit sphere to a (x, y) on a 2-D circle
 * viewed from the equator. `rotationDeg` rotates the sphere around the
 * Y axis (longitude).
 */
function project(
  lat: number,
  lon: number,
  rotationDeg: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number; depth: number } {
  const phi = (lat * Math.PI) / 180;
  const theta = ((lon + rotationDeg) * Math.PI) / 180;
  // Standard 3-D → 2-D equirectangular projection.
  const x = Math.cos(phi) * Math.sin(theta);
  const y = Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(theta);
  return {
    x: cx + x * radius,
    y: cy - y * radius,
    depth: z, // -1 (back) .. 1 (front), used to fade back-facing dots
  };
}

/* ---------- Layers ---------- */

function GlowBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 70% 50%, rgba(0,255,157,0.18), transparent 70%), radial-gradient(ellipse 50% 40% at 30% 80%, rgba(0,184,255,0.10), transparent 70%)',
      }}
    />
  );
}

function Globe() {
  const cx = 400;
  const cy = 220;
  const r = 170;
  const dots = fibonacciSphere(120);

  // Pre-compute the latitude rings as SVG ellipses (a wireframe).
  const latRings = [-60, -30, 0, 30, 60].map((latDeg) => {
    // sin(lat) gives the Y offset, cos(lat) gives the radius at that latitude
    const y = cy - Math.sin((latDeg * Math.PI) / 180) * r;
    const ringR = Math.cos((latDeg * Math.PI) / 180) * r;
    return (
      <ellipse
        key={`lat-${latDeg}`}
        cx={cx}
        cy={y}
        rx={ringR}
        ry={ringR * 0.18}
        fill="none"
        stroke="rgba(0,255,157,0.25)"
        strokeWidth={0.8}
      />
    );
  });

  // Longitude meridians — these are rotated by CSS so we draw a
  // generic full-ellipse and let the wrapper `transform: rotateY()`
  // simulate the rotation. Since CSS rotateY is invisible on a 2-D
  // ellipse, we instead use a rotation around the Y axis in SVG
  // via animating each meridian's stroke-dashoffset to fake motion.
  const meridians = [0, 30, 60, 90, 120, 150].map((lonDeg) => (
    <ellipse
      key={`lon-${lonDeg}`}
      cx={cx}
      cy={cy}
      rx={Math.abs(Math.cos((lonDeg * Math.PI) / 180)) * r}
      ry={r}
      fill="none"
      stroke="rgba(0,255,157,0.18)"
      strokeWidth={0.6}
    />
  ));

  // Static point cloud — drawn at one snapshot, the wrapper rotates
  // them around the Y axis via `transform: rotateY(...)` keyframes.
  // For a 2-D ellipse, rotateY collapses them; instead we animate
  // each dot's `cx` to fake the longitude shift.
  const dotNodes = dots.map((p, i) => {
    const projected = project(p.lat, p.lon, 0, cx, cy, r);
    const isFront = projected.depth > 0;
    return (
      <circle
        key={i}
        cx={projected.x}
        cy={projected.y}
        r={isFront ? 1.4 : 0.9}
        fill="#00FF9D"
        opacity={isFront ? 0.85 : 0.18}
        style={{
          filter: 'drop-shadow(0 0 2px #00FF9D)',
          transformOrigin: `${cx}px ${cy}px`,
          animation: `globe-spin 60s linear infinite`,
          animationDelay: `-${(i % 24) * 2.5}s`,
        }}
      />
    );
  });

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 440"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <radialGradient id="globe-rim" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="rgba(0,255,157,0)" />
          <stop offset="95%" stopColor="rgba(0,255,157,0.30)" />
          <stop offset="100%" stopColor="rgba(0,255,157,0)" />
        </radialGradient>
      </defs>
      {/* Outer rim glow */}
      <circle cx={cx} cy={cy} r={r + 4} fill="url(#globe-rim)" />
      {/* Latitude rings (animated drift) */}
      <g
        style={{
          animation: 'globe-tilt 24s ease-in-out infinite alternate',
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        {latRings}
        {meridians}
      </g>
      {/* Equator line (slightly stronger) */}
      <line
        x1={cx - r}
        y1={cy}
        x2={cx + r}
        y2={cy}
        stroke="rgba(0,255,157,0.45)"
        strokeWidth={1}
      />
      {/* Dots — drift via keyframe */}
      <g>{dotNodes}</g>
      {/* Vertical prime meridian */}
      <line
        x1={cx}
        y1={cy - r}
        x2={cx}
        y2={cy + r}
        stroke="rgba(0,255,157,0.30)"
        strokeWidth={0.8}
      />
    </svg>
  );
}

function AnimatedChart() {
  /*
   * Live-looking trading chart drawn as inline SVG. Two stacked panels:
   *   - upper: line chart with smooth bezier curve + animated stroke
   *            (dasharray) so it looks like it's drawing in real time
     - lower: candlestick histogram with subtle pulse
   *
   * The whole layer is decorative (aria-hidden, pointer-events-none) but
   * it carries the Bloomberg/TradingView feel the user asked for.
   */

  // ---- Top: smooth line chart ----
  const w = 800;
  const h = 200;
  const points = 32;
  // Build a deterministic upward-trending series with noise.
  const series: number[] = [];
  let seed = 1234;
  for (let i = 0; i < points; i++) {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    const noise = ((seed / 2 ** 32) - 0.5) * 0.3;
    const trend = (i / (points - 1)) * 0.55;
    series.push(0.5 + trend * 0.4 + noise * 0.2);
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = w / (points - 1);

  // Smooth bezier path (Catmull-Rom-ish via simple control points).
  const linePath = (() => {
    const pts = series.map((v, i) => ({
      x: i * stepX,
      // invert y (top is high value)
      y: h - ((v - min) / range) * h * 0.85 - h * 0.075,
    }));
    let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1]!;
      const p1 = pts[i]!;
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  })();

  // Closed area path for the gradient fill (line + bottom edge).
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

  // Total length (approx) — for stroke-dasharray draw animation.
  const totalLen = points * stepX;

  // ---- Bottom: candlestick histogram ----
  const candles = Array.from({ length: 28 }, (_, i) => {
    const s = (i * 9301 + 49297) % 233280;
    const isUp = s / 233280 > 0.45;
    const h = 0.35 + ((s % 100) / 100) * 0.55;
    const color = isUp ? '#35D07F' : '#FF2A55';
    const colorGlow = isUp ? 'rgba(53,208,127,0.55)' : 'rgba(255,42,85,0.55)';
    return { i, h, color, colorGlow };
  });

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${w} ${h + 80}`}
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 w-full"
      style={{ height: '46%' }}
    >
      <defs>
        <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,255,157,0.25)" />
          <stop offset="100%" stopColor="rgba(0,255,157,0)" />
        </linearGradient>
      </defs>

      {/* ---- Top: smooth line + area fill ---- */}
      <g>
        {/* area */}
        <path
          d={areaPath}
          fill="url(#chart-area)"
          style={{
            animation: 'chart-fade-in 1.6s ease-out both',
          }}
        />
        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke="#00FF9D"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(0,255,157,0.55))',
            strokeDasharray: totalLen,
            strokeDashoffset: totalLen,
            animation: 'chart-draw 6s ease-out forwards, chart-glow 3s ease-in-out infinite alternate',
          }}
        />
        {/* moving dot at the tip — looks like a live tick cursor */}
        <circle
          r={3.5}
          fill="#00FF9D"
          style={{
            filter: 'drop-shadow(0 0 6px #00FF9D)',
            // offset-path moves the circle along the linePath. Cast to
            // `any` because TypeScript doesn't know the -webkit- vendor
            // property yet (Safari < 16.4 needs it).
            offsetPath: `path('${linePath}')`,
            // @ts-expect-error - vendor prefix not in TS DOM types
            WebkitOffsetPath: `path('${linePath}')`,
            animation: 'chart-tick 18s linear infinite',
          }}
        />
      </g>

      {/* ---- Bottom: candlesticks ---- */}
      <g transform={`translate(0 ${h + 8})`}>
        {candles.map((c, i) => {
          const x = ((i + 0.5) / candles.length) * w;
          const bodyH = c.h * 50;
          const wickH = bodyH * 0.4;
          const bodyY = 40 - bodyH / 2;
          return (
            <g
              key={c.i}
              style={{
                animation: `candle-pulse ${2 + (i % 5) * 0.4}s ease-in-out infinite`,
                animationDelay: `-${i * 0.15}s`,
                transformOrigin: `${x}px 40px`,
              }}
            >
              <line
                x1={x}
                y1={bodyY - wickH / 2}
                x2={x}
                y2={bodyY + bodyH + wickH / 2}
                stroke={c.color}
                strokeWidth={1}
                opacity={0.8}
              />
              <rect
                x={x - 3}
                y={bodyY}
                width={6}
                height={bodyH}
                fill={c.color}
                style={{ filter: `drop-shadow(0 0 4px ${c.colorGlow})` }}
                rx={1}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ---------- Public component ---------- */

export function CyberGlobe({ className, style, opacity = 0.9 }: CyberGlobeProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        // absolute under content; pointer-events so nothing clicks through
        'absolute inset-0 overflow-hidden pointer-events-none',
        className ?? '',
      ].join(' ')}
      style={{ opacity, zIndex: 0, ...style }}
    >
      <GlowBackdrop />
      <Globe />
      <AnimatedChart />
    </div>
  );
}
