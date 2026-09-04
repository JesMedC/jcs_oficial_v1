/*
 * one-by-one-thousand-discipline (PR-2) — WinrateBySessionCard.
 *
 * 4-band session winrate tiles (ASIA / EUROPA / NY_AMERICA / NY_PM)
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
 *
 * Visual language: glass card, Orbitron uppercase labels, integer
 * winrate as jade % text. No animations / charts — this is a
 * snapshot of "where do you win?", not a time series.
 */
import { useMemo, useState } from 'react';

import { useSessionStats } from '../../features/dashboard/hooks';
import type { SessionBand, SessionTile } from '../../features/dashboard/hooks';

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
   * when absent we hide the chip and behave as "all accounts" by
   * default.
   */
  readonly availableAccounts?: ReadonlyArray<{ readonly id: string; readonly name: string }>;
}

const SESSION_ORDER: ReadonlyArray<SessionBand> = ['ASIA', 'EUROPA', 'NY_AMERICA', 'NY_PM'];

const SESSION_LABEL: Record<SessionBand, string> = {
  ASIA: 'Asia',
  EUROPA: 'Europa',
  NY_AMERICA: 'NY AM',
  NY_PM: 'NY PM',
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function Tile({ band, tile }: { readonly band: SessionBand; readonly tile: SessionTile }) {
  const empty = tile.trades === 0;
  return (
    <div
      data-testid={`session-tile-${band}`}
      className="rounded-lg border border-primary/20 bg-surface/40 backdrop-blur-md p-3"
    >
      <div className="text-[10px] font-display uppercase tracking-widest text-text-muted">
        {SESSION_LABEL[band]}
      </div>
      <div className={`text-xl font-display mt-1 ${empty ? 'text-text-muted' : 'text-primary'}`}>
        {empty ? '—' : `${tile.winrate_pct}%`}
      </div>
      <div className="text-[11px] font-mono text-text-secondary">
        {empty ? 'Sin ops' : `${tile.wins} gan / ${tile.trades} tot`}
      </div>
    </div>
  );
}

function GeneralTile({ tile }: { readonly tile: SessionTile }) {
  const empty = tile.trades === 0;
  return (
    <div
      data-testid="session-tile-general"
      className="rounded-lg border border-primary/30 bg-primary/5 backdrop-blur-md p-3"
    >
      <div className="text-[10px] font-display uppercase tracking-widest text-primary">
        General
      </div>
      <div className={`text-2xl font-display mt-1 ${empty ? 'text-text-muted' : 'text-primary'}`}>
        {empty ? '—' : `${tile.winrate_pct}%`}
      </div>
      <div className="text-[11px] font-mono text-text-secondary">
        {empty ? 'Sin ops' : `${tile.wins} gan / ${tile.trades} tot`}
      </div>
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
      className="rounded-lg border border-primary/20 bg-surface/40 backdrop-blur-md p-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display uppercase tracking-wide text-sm md:text-base">
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
              className="appearance-none cursor-pointer font-body text-xs pl-2 pr-6 py-1 rounded-md bg-[rgba(13,21,30,0.7)] border border-[rgba(0,255,157,0.35)] text-text-primary focus:border-[#00FF9D] focus:outline-none"
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
        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          {sessions
            ? SESSION_ORDER.map((band) => (
                <Tile
                  key={band}
                  band={band}
                  tile={sessions[band] ?? { trades: 0, wins: 0, winrate_pct: 0 }}
                />
              ))
            : SESSION_ORDER.map((band) => (
                <Tile key={band} band={band} tile={{ trades: 0, wins: 0, winrate_pct: 0 }} />
              ))}
          {general ? (
            <GeneralTile tile={general} />
          ) : (
            <GeneralTile tile={{ trades: 0, wins: 0, winrate_pct: 0 }} />
          )}
        </div>
      )}
    </div>
  );
}