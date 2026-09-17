/*
 * jarvis-ui-redesign (T-13 polish) — WinrateBySessionCard with the
 * HUD connector strip + per-tile ring.
 *
 * Layout per the reference image:
 *
 *   [ASIA 75%] — [LONDRES —] — [NUEVA YORK —] — [SIDNEY —] — [GENERAL 71%]
 *       6/8          0/0            0/0           0/0         10/14 tot
 *
 * The tiles are connected by a thin cyan horizontal line (drawn as a
 * pseudo-element on the parent grid) that visually links them like
 * the JARVIS HUD timeline. Each tile carries its own progress ring
 * on the right side (driven by `winrate_pct`), and the headline
 * percentage sits in display font + cyan glow above the count.
 *
 * 4-band session winrate tiles (ASIA / LONDON / NEW_YORK / SYDNEY)
 * plus a general tile. REQ-WRS-006/007 drive this composition:
 * integer % labels, no decorative breakdown, scope chip for
 * "all accounts" vs single account.
 *
 * Wired into:
 *   - CuentasDetailPage (ResumenTab, next to the existing summary)
 *   - the main dashboard (future — REQ-WRS-007 explicitly permits
 *     reuse, hence the optional ``accountId`` prop)
 *
 * Reads ``useSessionStats`` from ``features/dashboard/hooks.ts``.
 * Workspace id comes from auth context; the parent may pre-set it
 * or pass ``null`` to defer the fetch until auth resolves.
 */
import { useMemo, useState } from 'react';

import { useSessionStats } from '../../features/dashboard/hooks';
import type { SessionBand, SessionTile } from '../../features/dashboard/hooks';
import { HudRing } from '../../components/ui/HudRing';
import {
  SESSION_LABELS,
  SESSION_ORDER,
} from '../../features/sessions';

interface Props {
  readonly workspaceId: string;
  /** YYYY-MM-DD inclusive (default: rolling 30-day window). */
  readonly dateFrom?: string;
  readonly dateTo?: string;
  /** Single-account scope (``null`` = "all accounts"). */
  readonly initialAccountId?: string | null;
  /**
   * Optional list of accounts to populate the scope chip. When
   * provided the chip renders as a selector (mirrors AccountSelector);
   */
  readonly availableAccounts?: ReadonlyArray<{ id: string; name: string }>;
}
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * One HUD tile: label + winrate pct + count, with the right-edge ring.
 * The connector strip is drawn by the parent grid (not by this card).
 */
function HudTile({
  band,
  tile,
  highlight = false,
}: {
  readonly band: SessionBand;
  readonly tile: SessionTile;
  readonly highlight?: boolean;
}) {
  const empty = tile.trades === 0;
  return (
    <div
      data-testid={`session-tile-${band}`}
      className={[
        'relative rounded-lg border bg-[var(--color-jade-border)]/40 backdrop-blur-md p-3 flex items-center gap-3',
        highlight ? 'border-primary' : 'border-primary/30',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        <div className="font-display uppercase tracking-[0.15em] text-[10px] text-text-muted truncate">
          {SESSION_LABELS[band]}
        </div>
        <div
          className={[
            'font-display mt-1 text-2xl md:text-3xl',
            highlight ? 'text-primary' : empty ? 'text-text-muted' : 'text-primary',
          ].join(' ')}
          style={
            highlight
              ? { textShadow: '0 0 14px rgba(0,212,216,0.6)' }
              : undefined
          }
        >
          {empty ? '—' : `${tile.winrate_pct}%`}
        </div>
        <div className="font-mono text-[10px] text-text-secondary mt-0.5">
          {empty ? 'Sin ops' : `${tile.wins} gan / ${tile.trades} tot`}
        </div>
      </div>
      <HudRing
        value={tile.winrate_pct}
        size="sm"
        tone="primary"
        showInner={false}
        aria-label={`${SESSION_LABELS[band]} winrate ${tile.winrate_pct}%`}
      />
    </div>
  );
}

export function WinrateBySessionCard({
  workspaceId,
  dateFrom,
  dateTo,
  initialAccountId = null,
  availableAccounts,
}: Props) {
  const from = dateFrom ?? isoDaysAgo(30);
  const to = dateTo ?? isoToday();
  const [accountId, setAccountId] = useState<string | null>(initialAccountId);

  const filters = useMemo(
    () => ({
      workspaceId,
      dateFrom: from,
      dateTo: to,
      ...(accountId !== null ? { accountId } : {}),
    }),
    [workspaceId, from, to, accountId],
  );

  const { data, isLoading, isError } = useSessionStats(filters);
  const hasScopeChip = (availableAccounts?.length ?? 0) > 1;

  // Tile content fallback (empty / loading): show zero tiles rather
  // than "undefined" — the backend always returns the keys, so
  // loading just means "no data yet".
  const sessions = data?.sessions;
  const general = data?.general;

  return (
    <div
      data-testid="winrate-by-session-card"
      className="relative rounded-lg border border-primary/30 bg-surface/40 backdrop-blur-md p-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display uppercase tracking-[0.15em] text-sm md:text-base">
          Winrate por sesión
        </h3>
        {hasScopeChip ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-display uppercase tracking-widest text-text-muted">
              Alcance
            </span>
            <select
              data-testid="winrate-account-scope"
              value={accountId ?? ''}
              onChange={(e) => setAccountId(e.target.value === '' ? null : e.target.value)}
              className="appearance-none cursor-pointer font-body text-xs pl-2 pr-6 py-1 rounded-md bg-[var(--glass-surface)] border border-primary/30 text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Todas</option>
              {availableAccounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div
          data-testid="winrate-loading"
          className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2"
        >
          {SESSION_ORDER.map((b) => (
            <div
              key={b}
              className="h-20 rounded-lg border border-primary/10 bg-surface/20 animate-pulse"
              data-testid={`session-tile-${b}`}
            />
          ))}
          <div
            className="h-20 rounded-lg border border-primary/10 bg-primary/5 animate-pulse"
            data-testid="session-tile-general"
          />
        </div>
      ) : isError ? (
        <div className="mt-3 text-loss font-body text-sm" data-testid="winrate-error">
          No pudimos cargar el winrate por sesión.
        </div>
      ) : (
        <div className="relative mt-4">
          {/* Connector strip — a thin cyan line drawn behind the tiles,
              visually linking them like the JARVIS HUD timeline. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-1/2 hidden md:block"
            style={{
              height: '1px',
              transform: 'translateY(-50%)',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(0,212,216,0.45) 8%, rgba(0,212,216,0.45) 92%, transparent 100%)',
            }}
          />
          <div className="relative grid grid-cols-2 md:grid-cols-5 gap-2">
            {sessions
              ? SESSION_ORDER.map((band) => (
                  <HudTile
                    key={band}
                    band={band}
                    tile={sessions[band] ?? { trades: 0, wins: 0, winrate_pct: 0 }}
                  />
                ))
              : SESSION_ORDER.map((band) => (
                  <HudTile
                    key={band}
                    band={band}
                    tile={{ trades: 0, wins: 0, winrate_pct: 0 }}
                  />
                ))}
            {general ? (
              <div data-testid="session-tile-general">
                <HudTile band="GENERAL" tile={general} highlight />
              </div>
            ) : (
              <div data-testid="session-tile-general">
                <HudTile band="GENERAL" tile={{ trades: 0, wins: 0, winrate_pct: 0 }} highlight />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
