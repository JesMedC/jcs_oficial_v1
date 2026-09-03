/*
 * PnLHeatmap — Módulo 2 / Calendario de P&L Mensual.
 *
 * GitHub-style 7×4 grid (4 weeks × 7 days). Each cell tints based
 * on the day's P&L intensity: jade neon for winners, neon red for
 * losers, abyssal for flat days. Cells also show a small P&L label
 * so the trader can identify big wins/losses at a glance.
 */
import type { HeatmapCell } from '../../features/dashboard/types';

interface Props {
  /** Outer array = weeks (4), inner = days (7). */
  readonly weeks: ReadonlyArray<ReadonlyArray<HeatmapCell>>;
}

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function formatUsd(n: number): string {
  if (Math.abs(n) >= 1000) {
    return `${n < 0 ? '-' : ''}$${(Math.abs(n) / 1000).toFixed(1)}k`;
  }
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(0)}`;
}

function cellStyle(cell: HeatmapCell): { background: string; borderColor: string; textColor: string } {
  if (cell.intensity === 0 || cell.trades === 0) {
    return {
      background: 'rgba(13,21,30,0.6)',
      borderColor: 'rgba(0,255,157,0.10)',
      textColor: 'rgba(255,255,255,0.35)',
    };
  }
  if (cell.intensity > 0) {
    // Winner: green tinted, intensity controls opacity.
    return {
      background: `rgba(53,208,127,${0.18 + Math.min(cell.intensity, 1) * 0.6})`,
      borderColor: `rgba(53,208,127,${0.35 + Math.min(cell.intensity, 1) * 0.5})`,
      textColor: cell.intensity > 0.4 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)',
    };
  }
  // Loser: red tinted.
  return {
    background: `rgba(255,42,85,${0.18 + Math.min(-cell.intensity, 1) * 0.55})`,
    borderColor: `rgba(255,42,85,${0.35 + Math.min(-cell.intensity, 1) * 0.5})`,
    textColor: cell.intensity < -0.4 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)',
  };
}

export function PnLHeatmap({ weeks }: Props) {
  return (
    <div
      data-testid="dash-pnl-heatmap"
      className="rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
            style={{ boxShadow: '0 0 6px #00FF9D' }}
            aria-hidden="true"
          />
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            Calendario P&amp;L
          </span>
        </div>
        <span className="font-display uppercase tracking-wider text-[9px] text-text-muted">
          Ultimos 28 dias
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        {/* Weekday column labels */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          {WEEKDAY_LABELS.map((label, idx) => (
            <div
              key={`wd-${idx}`}
              className="h-9 w-4 font-display uppercase text-[9px] text-text-muted flex items-center justify-center"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex-1 grid grid-cols-4 gap-1.5">
          {weeks.map((week, wIdx) =>
            week.map((cell, dIdx) => {
              const styles = cellStyle(cell);
              return (
                <div
                  key={`${wIdx}-${dIdx}`}
                  className="h-9 rounded-md border flex items-center justify-center"
                  style={{
                    background: styles.background,
                    borderColor: styles.borderColor,
                  }}
                  title={`Semana ${wIdx + 1}, dia ${dIdx + 1}: ${cell.trades} trades, ${formatUsd(cell.pnl)}`}
                >
                  <span
                    className="font-mono text-[10px] font-medium"
                    style={{
                      color: styles.textColor,
                      textShadow:
                        cell.intensity !== 0
                          ? '0 0 4px rgba(0,0,0,0.5)'
                          : 'none',
                    }}
                  >
                    {cell.trades > 0 ? formatUsd(cell.pnl) : '·'}
                  </span>
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
