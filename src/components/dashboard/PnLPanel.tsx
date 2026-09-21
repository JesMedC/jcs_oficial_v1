/*
 * PnLPanel — Módulo 1 / P&L (Profit & Loss).
 *
 * Net P&L (gross profit - gross loss) shown big, plus the percentage
 * growth of the account (net / totalDeposits). Colour switches by
 * sign: jade for positive, loss-red for negative.
 *
 * Below the headline, two compact read-outs:
 *   - "Bruto"   = gross profit on closed WIN trades
 *   - "Perdido" = gross loss on closed LOSS trades
 */
interface Props {
  readonly net: number;
  readonly grossProfit: number;
  readonly grossLoss: number;
  /** % growth of the account (net / totalDeposits × 100). */
  readonly growthPct: number;
}

function formatUsd(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return `${sign}${abs}`;
}

export function PnLPanel({ net, grossProfit, grossLoss, growthPct }: Props) {
  const positive = net >= 0;
  const color = positive ? '#00FF9D' : '#FF2A55';
  const sign = positive ? '+' : '−';
  const signLabel = positive ? '▲' : '▼';

  return (
    <div
      data-testid="dash-pnl"
      className="relative rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
          }}
          aria-hidden="true"
        />
        <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
          P&amp;L neto
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-3 flex-wrap">
        <span
          className="font-mono text-3xl md:text-4xl font-semibold"
          style={{ color, textShadow: `0 0 14px ${color}` }}
          data-testid="dash-pnl-value"
        >
          {sign}
          {formatUsd(net).replace('-', '')}
        </span>
        <span
          className="font-mono text-sm md:text-base font-medium"
          style={{ color, textShadow: `0 0 6px ${color}` }}
        >
          {signLabel} {Math.abs(growthPct).toFixed(1)}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="border border-[rgba(53,208,127,0.30)] rounded-lg px-3 py-2">
          <div className="font-display uppercase tracking-wide text-[10px] text-text-muted">
            Ganancia bruta
          </div>
          <div
            className="font-mono text-sm md:text-base text-[#35D07F] mt-0.5"
            style={{ textShadow: '0 0 6px rgba(53,208,127,0.5)' }}
          >
            +{formatUsd(grossProfit).replace('-', '')}
          </div>
        </div>
        <div className="border border-[rgba(255,42,85,0.30)] rounded-lg px-3 py-2">
          <div className="font-display uppercase tracking-wide text-[10px] text-text-muted">
            Perdida bruta
          </div>
          <div
            className="font-mono text-sm md:text-base text-[#FF2A55] mt-0.5"
            style={{ textShadow: '0 0 6px rgba(255,42,85,0.5)' }}
          >
            -{formatUsd(grossLoss).replace('-', '')}
          </div>
        </div>
      </div>
    </div>
  );
}
