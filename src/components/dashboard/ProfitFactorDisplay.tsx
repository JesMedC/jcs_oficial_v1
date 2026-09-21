/*
 * ProfitFactorDisplay — Módulo 4 / Métrica 1.
 *
 * Big digital readout. When the factor crosses 2.0 an "elite
 * performance" overlay pulses — slow jade ring + label flip.
 */
interface Props {
  readonly profitFactor: number;
}

function tier(pf: number): {
  color: string;
  bg: string;
  label: string;
} {
  if (pf >= 2.0) {
    return {
      color: '#00FF9D',
      bg: 'rgba(0,255,157,0.10)',
      label: 'Rendimiento elite',
    };
  }
  if (pf >= 1.5) {
    return {
      color: '#00B8FF',
      bg: 'rgba(0,184,255,0.10)',
      label: 'Rentable',
    };
  }
  if (pf >= 1.0) {
    return {
      color: '#F3B94E',
      bg: 'rgba(243,185,78,0.10)',
      label: 'Break-even',
    };
  }
  return {
    color: '#FF2A55',
    bg: 'rgba(255,42,85,0.10)',
    label: 'Perdida',
  };
}

export function ProfitFactorDisplay({ profitFactor }: Props) {
  const t = tier(profitFactor);
  const elite = profitFactor >= 2.0;

  return (
    <div
      data-testid="dash-profit-factor"
      className="relative rounded-xl border bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6 overflow-hidden"
      style={{ borderColor: `${t.color}55` }}
    >
      {elite ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background: `radial-gradient(circle at center, ${t.bg} 0%, transparent 70%)`,
            animation: 'pulse-soft 2.4s ease-in-out infinite',
          }}
        />
      ) : null}

      <div className="relative flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}` }}
          aria-hidden="true"
        />
        <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
          Profit factor
        </span>
      </div>

      <div className="relative mt-2 flex items-baseline gap-3 flex-wrap">
        <span
          className="font-mono text-4xl md:text-5xl font-semibold"
          style={{ color: t.color, textShadow: `0 0 14px ${t.color}` }}
        >
          {profitFactor.toFixed(2)}
        </span>
        <span
          className="font-display uppercase tracking-widest text-[10px] md:text-xs px-2 py-0.5 rounded-full border"
          style={{
            color: t.color,
            borderColor: `${t.color}66`,
            background: t.bg,
            textShadow: `0 0 4px ${t.color}`,
          }}
        >
          {t.label}
        </span>
      </div>

      <p className="relative mt-3 font-mono text-[11px] text-text-muted">
        Por cada $1 arriesgado, ganaste{' '}
        <span style={{ color: t.color }}>${profitFactor.toFixed(2)}</span> en promedio.
      </p>
    </div>
  );
}
