/*
 * TopPairsList — Módulo 3 / Salón de la Fama (Mejor Paridad).
 *
 * Ranked list of the trader's most-used pairs. The #1 row carries a
 * holographic star badge. Each row shows: rank, pair, kind chip,
 * win-rate micro bar, and P&L colored by sign.
 */
import type { PairStat } from '../../features/dashboard/types';

interface Props {
  readonly pairs: ReadonlyArray<PairStat>;
}

function formatUsd(n: number): string {
  const sign = n < 0 ? '-' : '+';
  const abs = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
  return `${sign}${abs}`;
}

function StarBadge() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className="text-[#00FF9D]"
      style={{ filter: 'drop-shadow(0 0 6px #00FF9D)' }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.5l2.6 6.4 6.9.5-5.3 4.5 1.7 6.8L12 17l-5.9 3.7 1.7-6.8L2.5 9.4l6.9-.5L12 2.5z"
      />
    </svg>
  );
}

export function TopPairsList({ pairs }: Props) {
  return (
    <div
      data-testid="dash-top-pairs"
      className="rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
          style={{ boxShadow: '0 0 6px #00FF9D' }}
          aria-hidden="true"
        />
        <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
          Salon de la fama
        </span>
      </div>

      <ul className="mt-3 divide-y divide-[rgba(0,255,157,0.08)]">
        {pairs.map((pair) => {
          const winner = pair.rank === 1;
          const isProfit = pair.pnl >= 0;
          const wrColor =
            pair.winRate >= 0.6
              ? '#35D07F'
              : pair.winRate >= 0.5
                ? '#F3B94E'
                : '#FF2A55';
          return (
            <li
              key={pair.pair}
              data-testid={`top-pair-${pair.rank}`}
              className={[
                'flex items-center gap-3 py-2.5',
                winner ? 'px-2 -mx-2 rounded-md bg-[rgba(0,255,157,0.05)]' : '',
              ].join(' ')}
            >
              <div className="w-7 shrink-0 flex justify-center" aria-hidden={!winner}>
                {winner ? (
                  <StarBadge />
                ) : (
                  <span className="font-mono text-xs text-text-muted">
                    #{pair.rank}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm text-text-primary truncate">
                    {pair.pair}
                  </span>
                  <span
                    className="inline-block px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded border"
                    style={{
                      color: pair.kind === 'FOREX' ? '#00FF9D' : '#00B8FF',
                      borderColor:
                        pair.kind === 'FOREX'
                          ? 'rgba(0,255,157,0.4)'
                          : 'rgba(0,184,255,0.35)',
                    }}
                  >
                    {pair.kind}
                  </span>
                </div>
                {/* Win-rate micro bar */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-[rgba(0,0,0,0.4)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pair.winRate * 100}%`,
                        background: wrColor,
                        boxShadow: `0 0 4px ${wrColor}`,
                      }}
                    />
                  </div>
                  <span
                    className="font-mono text-[10px] tabular-nums"
                    style={{ color: wrColor }}
                  >
                    {(pair.winRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="font-mono text-sm font-medium"
                  style={{
                    color: isProfit ? '#35D07F' : '#FF2A55',
                    textShadow: `0 0 6px ${isProfit ? '#35D07F' : '#FF2A55'}`,
                  }}
                >
                  {formatUsd(pair.pnl)}
                </div>
                <div className="font-mono text-[10px] text-text-muted">
                  {pair.trades} trades
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
