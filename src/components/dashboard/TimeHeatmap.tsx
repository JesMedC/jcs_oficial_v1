/*
 * TimeHeatmap — Módulo 4 / Métrica 5.
 *
 * Day-of-week × hour-of-day matrix (5×12 by default). Cells tint
 * jade (winning hours) or red (losing hours). The footer surfaces the
 * "AI suggestion" line — when late hours are net negative, the copy
 * tells the user to close the terminal at that point.
 */
import { useMemo } from 'react';

import type { HeatmapCell } from '../../features/dashboard/types';

interface Props {
  readonly matrix: ReadonlyArray<ReadonlyArray<HeatmapCell>>;
  /** Hour labels (one per column). */
  readonly hours: ReadonlyArray<string>;
  /** Day labels (one per row). */
  readonly days: ReadonlyArray<string>;
}

function cellStyle(cell: HeatmapCell): { background: string } {
  if (cell.intensity === 0 || cell.trades === 0) {
    return { background: 'rgba(13,21,30,0.6)' };
  }
  if (cell.intensity > 0) {
    return {
      background: `rgba(53,208,127,${0.18 + Math.min(cell.intensity, 1) * 0.55})`,
    };
  }
  return {
    background: `rgba(255,42,85,${0.18 + Math.min(-cell.intensity, 1) * 0.5})`,
  };
}

export function TimeHeatmap({ matrix, hours, days }: Props) {
  const suggestion = useMemo<string | null>(() => {
    // Find the latest hour (column) where the cumulative P&L across
    // weekdays is negative — that's where we suggest the user
    // should stop trading for the day.
    let cumulative = 0;
    let firstLossHour: number | null = null;
    for (let h = 0; h < hours.length; h += 1) {
      for (let d = 0; d < matrix.length; d += 1) {
        const cell = matrix[d]?.[h];
        if (!cell) continue;
        cumulative += cell.pnl;
      }
      if (firstLossHour === null && cumulative < 0) {
        firstLossHour = h;
      }
    }
    if (firstLossHour === null) return null;
    return `Tu winrate cae despues de las ${hours[firstLossHour]}. Sugerencia: cierra la terminal a esa hora.`;
  }, [matrix, hours]);

  return (
    <div
      data-testid="dash-time-heatmap"
      className="rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
          style={{ boxShadow: '0 0 6px #00FF9D' }}
          aria-hidden="true"
        />
        <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
          Heatmap de horarios
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full" style={{ minWidth: 480 }}>
          <thead>
            <tr>
              <th className="w-10" />
              {hours.map((h) => (
                <th
                  key={h}
                  className="font-display uppercase text-[9px] text-text-muted font-normal px-1 py-1"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, dIdx) => (
              <tr key={days[dIdx]}>
                <td className="font-display uppercase text-[10px] text-text-muted pr-2">
                  {days[dIdx]}
                </td>
                {row.map((cell, hIdx) => {
                  const style = cellStyle(cell);
                  return (
                    <td key={hIdx} className="p-0.5">
                      <div
                        className="h-7 w-full rounded border border-[rgba(0,255,157,0.10)]"
                        style={{
                          background: style.background,
                          boxShadow:
                            cell.intensity > 0.6
                              ? '0 0 6px rgba(53,208,127,0.5)'
                              : cell.intensity < -0.5
                                ? '0 0 6px rgba(255,42,85,0.5)'
                                : 'none',
                        }}
                        title={`${days[dIdx]} ${hours[hIdx]}: ${cell.trades} trades, $${cell.pnl.toFixed(0)}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {suggestion !== null ? (
        <div
          className="mt-4 px-3 py-2 rounded-md border border-[rgba(0,255,157,0.30)] bg-[rgba(0,255,157,0.05)] flex items-start gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00FF9D"
            strokeWidth="2"
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            style={{ filter: 'drop-shadow(0 0 4px #00FF9D)' }}
          >
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
          </svg>
          <span className="font-body text-xs text-text-secondary leading-snug">
            <span className="font-display uppercase tracking-wide text-[10px] text-[#00FF9D] mr-1">
              IA:
            </span>
            {suggestion}
          </span>
        </div>
      ) : null}
    </div>
  );
}
