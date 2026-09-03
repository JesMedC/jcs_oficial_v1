/*
 * MaxDrawdownBar — Módulo 4 / Métrica 3.
 *
 * Inverse-progress bar (red). The bigger the drawdown, the bigger
 * the filled segment. The label inside the bar reads the % in
 * tabular numerals so the trader can read the magnitude instantly.
 */
interface Props {
  readonly drawdownPct: number;
}

export function MaxDrawdownBar({ drawdownPct }: Props) {
  const safe = Math.max(0, Math.min(100, drawdownPct));
  // Colour tiers — the deeper, the redder.
  const color = safe < 10 ? '#F3B94E' : safe < 20 ? '#FF2A55' : '#FF4D8B';
  return (
    <div
      data-testid="dash-max-drawdown"
      className="rounded-xl border border-[rgba(255,42,85,0.30)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#FF2A55', boxShadow: '0 0 6px #FF2A55' }}
            aria-hidden="true"
          />
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            Max drawdown
          </span>
        </div>
        <span
          className="font-mono text-2xl md:text-3xl font-semibold"
          style={{ color, textShadow: `0 0 10px ${color}` }}
        >
          {safe.toFixed(1)}%
        </span>
      </div>

      <div className="mt-3 relative h-7 rounded-full bg-[rgba(0,0,0,0.45)] border border-[rgba(255,42,85,0.30)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${safe}%`,
            background: `linear-gradient(90deg, rgba(255,42,85,0.55) 0%, ${color} 100%)`,
            boxShadow: `0 0 12px ${color}`,
            transition: 'width 0.8s ease-out',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-3 font-mono text-[11px] text-white/90">
          {safe >= 15 ? 'Riesgo elevado' : safe >= 8 ? 'Atencion' : 'Controlado'}
        </div>
      </div>

      <p className="mt-2 font-mono text-[11px] text-text-muted">
        Mayor caida del balance desde un pico hasta un valle en el periodo.
      </p>
    </div>
  );
}
