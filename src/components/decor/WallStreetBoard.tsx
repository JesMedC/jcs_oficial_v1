/*
 * Cyber-Jade — WallStreetBoard.
 *
 * Animated decorative background that mimics a Bloomberg / trading-floor
 * wall of LED tickers. Replaces the previous CyberGlobe (wireframe globe
 * + chart) with something more "wall street" per the latest user
 * direction:
 *
 *   - Six large stat tiles scattered across the canvas (label + big
 *     number + delta arrow). Each tile drifts horizontally and
 *     vertically on a slow loop, like a stock ticker on steroids.
 *   - A continuous horizontal ticker strip at the bottom with dozens
 *     of mini-quotes (instrument · price · % change) scrolling right
 *     to left.
 *   - A second ticker strip at the top with similar content but
 *     different speeds and slightly different palette (so the eye
 *     doesn't read them as the same loop).
 *
 * All purely decorative: aria-hidden, pointer-events-none, behind the
 * actual UI (z-0). Animations are CSS-only (transform + opacity) so
 * they cost ~nothing per frame.
 *
 * Determinism: the underlying series and delta signs come from a tiny
 * seeded PRNG so the visual is stable across renders (no flicker on
 * hot reload).
 */

export interface WallStreetBoardProps {
  readonly className?: string;
}

/* ---------------- Seeded PRNG ---------------- */

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Tile grid (the "wall" of big numbers) ---------------- */

const TILES: ReadonlyArray<{
  label: string;
  base: number;
  decimals: number;
  drift: number;
  speed: number;
  delay: number;
  size: 'lg' | 'md' | 'sm';
}> = [
  { label: 'S&P 500', base: 5_487.32, decimals: 2, drift: 0.0008, speed: 22, delay: 0, size: 'lg' },
  { label: 'NASDAQ', base: 18_412.55, decimals: 2, drift: 0.0011, speed: 24, delay: -5, size: 'lg' },
  { label: 'DOW JONES', base: 39_847.21, decimals: 2, drift: 0.0006, speed: 28, delay: -8, size: 'md' },
  { label: 'EUR/USD', base: 1.0843, decimals: 4, drift: 0.0004, speed: 18, delay: -3, size: 'md' },
  { label: 'GBP/JPY', base: 191.245, decimals: 3, drift: 0.0009, speed: 20, delay: -10, size: 'md' },
  { label: 'XAU/USD', base: 2_341.18, decimals: 2, drift: 0.0012, speed: 26, delay: -7, size: 'sm' },
  { label: 'BTC/USD', base: 67_840.5, decimals: 1, drift: 0.0018, speed: 16, delay: -2, size: 'sm' },
  { label: 'WTI CRUDE', base: 78.42, decimals: 2, drift: 0.001, speed: 24, delay: -12, size: 'sm' },
];

function BigTiles() {
  // Each tile gets a unique jitter seed so its drift and pulse phase
  // don't all sync up.
  const rng = makeRng(987_654);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        // spread tiles across the canvas, some hidden behind the main
        // content area on purpose (depth illusion).
        backgroundImage:
          'radial-gradient(ellipse 60% 40% at 25% 30%, rgba(0,255,157,0.06), transparent 70%), radial-gradient(ellipse 60% 40% at 75% 70%, rgba(0,184,255,0.06), transparent 70%)',
      }}
    >
      {TILES.map((t, i) => {
        // Deterministic position + size variation.
        const r = rng();
        const left = `${(r * 90).toFixed(1)}%`;
        const top = `${((i * 37) % 80 + 8).toFixed(1)}%`;
        const opacity = 0.35 + (rng() * 0.25);
        const dim =
          t.size === 'lg'
            ? 'w-44 md:w-52'
            : t.size === 'md'
              ? 'w-36 md:w-44'
              : 'w-28 md:w-32';

        return (
          <div
            key={t.label}
            className={[
              'absolute',
              'flex flex-col gap-1 px-3 py-2 rounded-md',
              'bg-[rgba(13,21,30,0.55)] backdrop-blur-md',
              'border border-[rgba(0,255,157,0.18)]',
              'text-left',
              dim,
            ].join(' ')}
            style={{
              left,
              top,
              opacity,
              // individual tile pulses + slow vertical drift
              animation: `tile-pulse ${3 + (i % 4)}s ease-in-out infinite alternate, tile-drift ${t.speed}s ease-in-out infinite alternate`,
              animationDelay: `${t.delay}s, ${t.delay / 2}s`,
            }}
          >
            <span className="font-display uppercase tracking-wider text-[9px] md:text-[10px] text-text-muted">
              {t.label}
            </span>
            <span
              className="font-mono text-base md:text-xl font-medium text-white"
              style={{ textShadow: '0 0 6px rgba(255,255,255,0.15)' }}
            >
              {formatNumber(t.base, t.decimals)}
            </span>
            <DeltaArrow seed={i * 13 + 7} decimals={t.decimals} />
          </div>
        );
      })}
    </div>
  );
}

function DeltaArrow({ seed, decimals }: { seed: number; decimals: number }) {
  // Deterministic sign per seed.
  const rng = makeRng(seed);
  const isUp = rng() > 0.45;
  const pct = (rng() * 4 + 0.1).toFixed(decimals === 4 ? 3 : 2);
  return (
    <span
      className={[
        'font-mono text-[11px] md:text-xs',
        isUp ? 'text-[#35D07F]' : 'text-[#FF2A55]',
      ].join(' ')}
      style={{ textShadow: `0 0 6px ${isUp ? 'rgba(53,208,127,0.5)' : 'rgba(255,42,85,0.5)'}` }}
    >
      {isUp ? '▲' : '▼'} {pct}%
    </span>
  );
}

function formatNumber(value: number, decimals: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/* ---------------- Bottom ticker strip ---------------- */

interface Quote {
  sym: string;
  price: number;
  pct: number;
}

const QUOTES: ReadonlyArray<Quote> = [
  { sym: 'AAPL', price: 218.34, pct: 1.42 },
  { sym: 'MSFT', price: 432.11, pct: -0.32 },
  { sym: 'GOOGL', price: 178.55, pct: 0.81 },
  { sym: 'AMZN', price: 192.74, pct: 2.16 },
  { sym: 'TSLA', price: 248.91, pct: -1.84 },
  { sym: 'META', price: 489.22, pct: 0.55 },
  { sym: 'NVDA', price: 124.83, pct: 3.21 },
  { sym: 'JPM', price: 198.45, pct: 0.12 },
  { sym: 'V', price: 269.78, pct: -0.45 },
  { sym: 'EUR/USD', price: 1.0843, pct: 0.18 },
  { sym: 'GBP/JPY', price: 191.245, pct: -0.61 },
  { sym: 'USD/JPY', price: 154.221, pct: 0.34 },
  { sym: 'XAU/USD', price: 2341.18, pct: 1.04 },
  { sym: 'BTC/USD', price: 67840.5, pct: -2.31 },
  { sym: 'ETH/USD', price: 3782.16, pct: 1.78 },
  { sym: 'WTI', price: 78.42, pct: -0.92 },
  { sym: 'BRENT', price: 82.18, pct: -0.71 },
  { sym: 'DXY', price: 104.21, pct: 0.08 },
  { sym: 'SPX', price: 5487.32, pct: 0.43 },
  { sym: 'NDX', price: 18412.55, pct: 0.91 },
];

function TickerStrip({
  speed,
  reverse = false,
  palette = 'jade',
}: {
  speed: number;
  reverse?: boolean;
  palette?: 'jade' | 'mixed';
}) {
  // Duplicate the list twice so the loop wraps seamlessly.
  const items = [...QUOTES, ...QUOTES];
  return (
    <div
      aria-hidden="true"
      className="absolute left-0 right-0 overflow-hidden pointer-events-none"
      style={{
        // sit as horizontal strips above/below the main canvas
        height: '36px',
        maskImage:
          'linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)',
      }}
    >
      <div
        className="flex items-center h-full gap-6 whitespace-nowrap"
        style={{
          animation: `${reverse ? 'ticker-scroll-rev' : 'ticker-scroll'} ${speed}s linear infinite`,
          width: 'max-content',
        }}
      >
        {items.map((q, i) => {
          const isUp = q.pct >= 0;
          const colorClass =
            palette === 'mixed' && i % 4 === 0
              ? 'text-text-primary'
              : isUp
                ? 'text-[#35D07F]'
                : 'text-[#FF2A55]';
          return (
            <span
              key={`${q.sym}-${i}`}
              className="flex items-center gap-2 font-mono text-[11px] md:text-xs"
            >
              <span
                className="font-display uppercase tracking-wider text-[10px] text-text-muted"
                style={{ textShadow: '0 0 4px rgba(0,255,157,0.3)' }}
              >
                {q.sym}
              </span>
              <span
                className="text-white"
                style={{ textShadow: '0 0 4px rgba(255,255,255,0.15)' }}
              >
                {formatNumber(q.price, q.price > 100 ? 2 : q.price > 10 ? 3 : 4)}
              </span>
              <span className={colorClass} style={{ textShadow: `0 0 4px currentColor` }}>
                {isUp ? '▲' : '▼'} {Math.abs(q.pct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Public component ---------------- */

export function WallStreetBoard({ className }: WallStreetBoardProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'absolute inset-0 overflow-hidden pointer-events-none',
        className ?? '',
      ].join(' ')}
      style={{ zIndex: 0 }}
    >
      <BigTiles />
      <TickerStrip speed={80} palette="jade" />
      <TickerStrip speed={120} reverse palette="mixed" />
    </div>
  );
}
