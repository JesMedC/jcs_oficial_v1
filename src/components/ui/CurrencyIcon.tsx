/*
 * jarvis-ui-redesign (T-15 polish) — CurrencyIcon primitive.
 *
 * Renders a small SVG emblem for a currency pair like 'EUR/USD',
 * 'GBP/JPY', 'AUD/JPY'. We split the pair, pick the two flag-style
 * SVG circles, and lay them out side-by-side in a tight overlap
 * (the 'jarvis' badge style — a coin on the left, a coin on the
 * right). The colors track the major market forex palette (deep
 * blue for USD/EUR/GBP/AUD, red for JPY, etc.).
 *
 * Fallback: if the instrument doesn't look like a forex pair, we
 * render a generic globe-circle so the row never breaks layout.
 */
interface CurrencyIconProps {
  readonly instrument: string;
  readonly size?: number;
}

interface CoinSpec {
  readonly fill: string;
  readonly ringColor: string;
  readonly label: string;
}

const COIN_COLORS: Record<string, CoinSpec> = {
  USD: { fill: '#1F4E8C', ringColor: '#0E2C5A', label: 'USD' },
  EUR: { fill: '#1B3D7A', ringColor: '#0A1F45', label: 'EUR' },
  GBP: { fill: '#A1245B', ringColor: '#5C0F33', label: 'GBP' },
  JPY: { fill: '#D34B4B', ringColor: '#7A2727', label: 'JPY' },
  AUD: { fill: '#3B6CB7', ringColor: '#1F3D72', label: 'AUD' },
  CAD: { fill: '#C9542A', ringColor: '#7A2F18', label: 'CAD' },
  CHF: { fill: '#D14B4B', ringColor: '#7A2727', label: 'CHF' },
  NZD: { fill: '#1F4E8C', ringColor: '#0E2C5A', label: 'NZD' },
};

function coinFor(code: string): CoinSpec {
  const upper = code.toUpperCase().slice(0, 3);
  return (
    COIN_COLORS[upper] ?? {
      fill: '#3A4A5E',
      ringColor: '#1F2A38',
      label: upper,
    }
  );
}

export function CurrencyIcon({ instrument, size = 24 }: CurrencyIconProps) {
  const parts = instrument.split(/[\/\-_]/).map((s) => s.trim()).filter(Boolean);
  const base = parts[0] ?? '';
  const quote = parts[1] ?? '';
  const a = coinFor(base);
  const b = coinFor(quote);
  const r = size / 2;
  const off = size * 0.32;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* base coin (left) */}
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill={a.fill}
        stroke={a.ringColor}
        strokeWidth="1"
      />
      <text
        x={r}
        y={r + 3}
        textAnchor="middle"
        fontSize={size * 0.36}
        fontWeight="700"
        fill="rgba(255,255,255,0.95)"
        fontFamily="JetBrains Mono, monospace"
      >
        {a.label.slice(0, 3)}
      </text>
      {/* quote coin (right, overlapping) */}
      {quote ? (
        <>
          <circle
            cx={r + off}
            cy={r}
            r={r - 1}
            fill={b.fill}
            stroke={b.ringColor}
            strokeWidth="1"
          />
          <text
            x={r + off}
            y={r + 3}
            textAnchor="middle"
            fontSize={size * 0.36}
            fontWeight="700"
            fill="rgba(255,255,255,0.95)"
            fontFamily="JetBrains Mono, monospace"
          >
            {b.label.slice(0, 3)}
          </text>
        </>
      ) : null}
    </svg>
  );
}

export type { CurrencyIconProps };
