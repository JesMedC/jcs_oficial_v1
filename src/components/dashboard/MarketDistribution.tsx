/*
 * MarketDistribution — Módulo 3 / Distribución de Mercado.
 *
 * Back-to-back horizontal bars (tornado-style) for Binary vs Forex.
 * Each side shows volume + P&L so the trader sees which market is
 * contributing more profit at a glance.
 *
 * FUND / WITHDRAW are excluded from this widget on purpose: they're
 * capital movements, not "trading outcomes" — they belong in the
 * cashflow panel instead. `useDashboardData` already filters them
 * out before computing the slices; the Record keys here stay
 * restricted to BINARY/FOREX as a defensive type.
 */
import type { MarketSlice } from '../../features/dashboard/types';

interface Props {
  readonly slices: ReadonlyArray<MarketSlice>;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
}

type MarketColorKey = 'BINARY' | 'FOREX';
const KIND_COLOR: Record<MarketColorKey, string> = {
  BINARY: '#00B8FF',
  FOREX: '#00FF9D',
};

export function MarketDistribution({ slices }: Props) {
  const maxVolume = Math.max(...slices.map((s) => s.volume), 1);

  return (
    <div
      data-testid="dash-market-distribution"
      className="rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
          style={{ boxShadow: '0 0 6px #00FF9D' }}
          aria-hidden="true"
        />
        <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
          Distribucion de mercado
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {slices.map((slice) => {
          // FUND / WITHDRAW never reach this widget (filtered out by
          // useDashboardData.computeMarketDistribution) but we keep
          // a safe fallback colour just in case.
          const color =
            slice.kind === 'BINARY' || slice.kind === 'FOREX'
              ? KIND_COLOR[slice.kind]
              : '#8A9BA8';
          const widthPct = (slice.volume / maxVolume) * 100;
          return (
            <div key={slice.kind}>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="font-display uppercase tracking-wider text-xs"
                  style={{ color, textShadow: `0 0 6px ${color}` }}
                >
                  {slice.kind}
                </span>
                <span className="font-mono text-xs text-text-primary">
                  {slice.trades} trades
                </span>
              </div>
              <div className="relative h-7 rounded-md bg-[rgba(0,0,0,0.35)] border border-[rgba(0,255,157,0.12)] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, ${color}33 0%, ${color} 100%)`,
                    boxShadow: `0 0 12px ${color}`,
                  }}
                />
                <div className="relative h-full flex items-center justify-between px-3 font-mono text-[11px]">
                  <span className="text-white/90">Vol: {formatUsd(slice.volume)}</span>
                  <span
                    style={{
                      color: slice.pnl >= 0 ? '#35D07F' : '#FF2A55',
                      textShadow: `0 0 6px ${slice.pnl >= 0 ? '#35D07F' : '#FF2A55'}`,
                    }}
                  >
                    {slice.pnl >= 0 ? '+' : '-'}
                    {formatUsd(slice.pnl)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
