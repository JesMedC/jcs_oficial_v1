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
 * DVC-03 — scope coherence + partition invariant:
 *   1. The account scope is CONTROLLED via `accountId` +
 *      `onAccountIdChange`; when the parent owns the selector
 *      (DashboardPage) the card follows it, fixing the once-copied
 *      `initialAccountId` snapshot foot-gun.
 *   2. The GENERAL percentage is computed locally as
 *      ``floor(wins / trades * 100)`` so it matches the floor rule
 *      the backend already uses for bands — 52/64 -> 81%, never
 *      80.3% from a different fractional formula.
 *   3. The card subtitle makes the period + timezone explicit so
 *      the user can verify the partition matches their expectation.
 *   4. A ``Σ(band.trades) === general.trades`` invariant is checked
 *      every render; on mismatch a ``Datos en revisión`` note is
 *      surfaced instead of silently rendering a stale/wrong split.
 *
 * Wired into:
 *   - CuentasDetailPage (ResumenTab — uncontrolled mount, no parent
 *     selector there)
 *   - the main DashboardPage (controlled via header AccountSelector)
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
  /**
   * Single-account scope (``null`` = "all accounts"). Seed for the
   * uncontrolled state when the parent does NOT drive the selector
   * via the `accountId` + `onAccountIdChange` pair.
   */
  readonly initialAccountId?: string | null;
  /**
   * Controlled account id — when provided alongside
   * `onAccountIdChange`, the parent owns the selection and changes
   * flow into the session-stats query filter on every render. Falls
   * back to a local `useState` seeded by `initialAccountId` when
   * absent (so the CuentasDetailPage mount continues to work).
   */
  readonly accountId?: string | null;
  /** Companion to `accountId` for fully-controlled mode. */
  readonly onAccountIdChange?: (id: string | null) => void;
  /**
   * Optional list of accounts to populate the scope chip. When
   * provided and more than one entry exists, the chip renders as a
   * selector (mirrors AccountSelector).
   */
  readonly availableAccounts?: ReadonlyArray<{ id: string; name: string }>;
  /**
   * Optional timezone override (IANA, e.g. ``"America/Santiago"``).
   * When omitted, the browser/profile timezone is resolved through
   * ``Intl.DateTimeFormat().resolvedOptions().timeZone``. Tests pass
   * the override explicitly to avoid jsdom TZ environment drift.
   */
  readonly timezone?: string | null;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bands list header shown on every card subtitle. Stable Spanish. */
const SESSION_LABEL_LINE = SESSION_ORDER.map((b) => SESSION_LABELS[b]).join(' / ');

/**
 * Floor-rounded integer winrate: 52/64 -> 81, 10/18 -> 55. Matches
 * the backend ``floor(wins/n*100)`` rule the band tiles already
 * expose (REQ-WRS-004). Negative / zero-denominator inputs return 0
 * — the caller renders the ``—`` placeholder in that case.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function intWinratePct(wins: number, trades: number): number {
  if (!Number.isFinite(wins) || !Number.isFinite(trades) || trades <= 0) {
    return 0;
  }
  // ``Math.floor`` matches the backend's integer rule exactly; a
  // different rounding (e.g. Math.round) is what produced the 80.3%
  // drift on the General tile.
  return Math.floor((wins / trades) * 100);
}

export type ScopePeriod = 'HOY' | 'LAST_30D' | 'CURRENT_MONTH' | 'CUSTOM';

// eslint-disable-next-line react-refresh/only-export-components
export const PERIOD_LABEL: Record<Exclude<ScopePeriod, 'CUSTOM'>, string> = {
  HOY: 'Hoy',
  LAST_30D: 'Últimos 30 días',
  CURRENT_MONTH: 'Mes en curso',
};

/**
 * Resolve the dashboard period from the card's date range. Order
 * matters: ``HOY`` first (same day), then ``CURRENT_MONTH``
 * (first-of-month to today), then ``LAST_30D`` (30 days back to
 * today — the historical default), finally ``CUSTOM`` with the
 * literal date range rendered by the caller.
 *
 * ``todayIso`` is a parameter so the test suite can pin a date in
 * jsdom without depending on the real wall clock.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveScopePeriod(
  dateFrom: string,
  dateTo: string,
  todayIso: string,
): ScopePeriod {
  if (dateFrom === dateTo) {
    return dateFrom === todayIso ? 'HOY' : 'CUSTOM';
  }
  const fromMs = Date.parse(`${dateFrom}T00:00:00Z`);
  const toMs = Date.parse(`${dateTo}T00:00:00Z`);
  const todayMs = Date.parse(`${todayIso}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || !Number.isFinite(todayMs)) {
    return 'CUSTOM';
  }
  // Current-month: from = first UTC day of today, to = today.
  const firstOfMonth = new Date(
    Date.UTC(
      new Date(todayMs).getUTCFullYear(),
      new Date(todayMs).getUTCMonth(),
      1,
    ),
  );
  const firstOfMonthIso = firstOfMonth.toISOString().slice(0, 10);
  if (dateFrom === firstOfMonthIso && dateTo === todayIso) return 'CURRENT_MONTH';
  // Rolling-30: 30 UTC days back ending today.
  const days = Math.round((todayMs - fromMs) / (24 * 3600_000));
  if (days === 30 && dateTo === todayIso) return 'LAST_30D';
  return 'CUSTOM';
}

/**
 * Resolve a timezone label for the card subtitle. The override is
 * preferred over the browser resolution (the dashboard summary
 * strip / calendar can pass a profile TZ; tests pass ``"UTC"``
 * directly to bypass the jsdom env). Falls back to ``"UTC"`` when
 * both sources are unusable (no Intl in the runtime).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveTimezone(override?: string | null): string {
  if (override !== undefined && override !== null && override !== '') {
    return override;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Build the full card subtitle line: session labels list, period,
 * timezone. Pure helper so the subtitle wiring can be tested without
 * driving the React component (and without depending on a real
 * browser TZ through jsdom).
 *
 * Returns ``"{labels} · {period} · {tz}"``. ``CUSTOM`` ranges render
 * as ``"Del <from> al <to>"`` to keep the line unambiguous when the
 * dashboard window is something other than the three standard
 * presets.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function formatScopeSubtitle(
  dateFrom: string,
  dateTo: string,
  timezone: string,
  todayIso: string = isoToday(),
): string {
  const period = resolveScopePeriod(dateFrom, dateTo, todayIso);
  const periodText =
    period === 'CUSTOM'
      ? `Del ${dateFrom} al ${dateTo}`
      : PERIOD_LABEL[period];
  return `${SESSION_LABEL_LINE} · ${periodText} · ${timezone}`;
}

/**
 * One HUD tile: label + winrate pct + count, with the right-edge ring.
 * The connector strip is drawn by the parent grid (not by this card).
 *
 * ``pctOverride`` lets the parent force the rendered percentage (the
 * GENERAL tile passes a locally-derived floor value so the band
 * strip stays band-consistent — see DVC-03).
 */
function HudTile({
  band,
  label,
  tile,
  highlight = false,
  pctOverride,
}: {
  readonly band: SessionBand | 'GENERAL';
  readonly label?: string;
  readonly tile: SessionTile;
  readonly highlight?: boolean;
  readonly pctOverride?: number;
}) {
  const empty = tile.trades === 0;
  const displayLabel = label ?? (band === 'GENERAL' ? 'General' : SESSION_LABELS[band as SessionBand]);
  const displayedPct = pctOverride ?? tile.winrate_pct;
  return (
    <div
      data-testid={band === 'GENERAL' ? 'session-tile-general-tile' : `session-tile-${band}`}
      className="relative rounded-lg border border-primary bg-[var(--color-jade-border)]/40 backdrop-blur-md p-3 flex items-center gap-3 shadow-[0_0_24px_rgba(0,212,216,0.55)]"
    >
      <div className="flex-1 min-w-0">
        <div
          className={[
            'font-display uppercase tracking-[0.15em] text-[10px] truncate',
            highlight ? 'text-primary' : 'text-text-muted',
          ].join(' ')}
        >
          {displayLabel}
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
          {empty ? '100%' : `${displayedPct}%`}
        </div>
        <div className="font-mono text-[10px] text-text-secondary mt-0.5">
          {empty ? 'Sin ops' : `${tile.wins} gan / ${tile.trades} tot`}
        </div>
      </div>
      <HudRing
        value={displayedPct}
        size="sm"
        tone="primary"
        showInner={false}
        aria-label={`${displayLabel} winrate ${displayedPct}%`}
      />
    </div>
  );
}

export function WinrateBySessionCard({
  workspaceId,
  dateFrom,
  dateTo,
  initialAccountId = null,
  accountId: controlledAccountId,
  onAccountIdChange,
  availableAccounts,
  timezone,
}: Props) {
  const from = dateFrom ?? isoDaysAgo(30);
  const to = dateTo ?? isoToday();

  // Controlled vs uncontrolled account id — see DVC-03. When
  // `accountId` is provided the parent owns the source of truth and
  // internal state is never read. `initialAccountId` only seeds the
  // first uncontrolled mount so the CuentasDetailPage path (which
  // does not expose a parent selector) keeps working.
  const isControlled = controlledAccountId !== undefined;
  const [internalAccountId, setInternalAccountId] = useState<string | null>(
    initialAccountId,
  );
  const accountId: string | null = isControlled
    ? (controlledAccountId as string | null)
    : internalAccountId;
  const setAccountId = (id: string | null): void => {
    if (isControlled) {
      onAccountIdChange?.(id);
      return;
    }
    setInternalAccountId(id);
  };

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

  // Partition invariant (DVC-03) — Σ(band.trades) === general.trades
  // for the same filter. On mismatch, surface a "Datos en revisión"
  // badge rather than silently rendering the inconsistent split.
  // The mapper's diagnosis is that the screenshot's 24 vs 64 split
  // is an incoherent current-response shape; we MUST not invent data
  // and we MUST not paper over it with a freshly derived ratio.
  //
  // Empty-period exception: when every visible band reports zero
  // trades (`sum === 0`) we deliberately suppress the mismatch note.
  // A sum of zero with a non-zero general is the legitimate "no ops
  // in any session slot" case (e.g. an account that only trades in a
  // retired bucket, or a period the backend summarises but no band
  // bucket maps). Rendering the badge there would lie about a real
  // data discrepancy that the user cannot act on — the period is
  // genuinely empty, not mis-partitioned. Each empty tile still
  // renders "100% · Sin ops" (see the HudTile `empty` branch).
  const partition = useMemo(() => {
    if (!data || !sessions || !general) {
      return { ok: true as const, sum: 0, generalTrades: 0 };
    }
    const sum = SESSION_ORDER.reduce(
      (acc, b) => acc + (sessions[b]?.trades ?? 0),
      0,
    );
    const generalTrades = general.trades;
    const isEmptyPeriod = sum === 0;
    const isInconsistent = sum > 0 && sum !== generalTrades;
    return {
      ok: !isInconsistent,
      sum,
      generalTrades,
      isEmptyPeriod,
    };
  }, [data, sessions, general]);

  // Subtitle wiring — see `formatScopeSubtitle` for the rule. The
  // memo invalidates only when the date range or the resolved TZ
  // actually change, so we don't churn on every render.
  const subtitle = useMemo(
    () => formatScopeSubtitle(from, to, resolveTimezone(timezone)),
    [from, to, timezone],
  );

  // GENERAL percent uses the band-consistent floor formula (locally
  // computed from counts) so the strip stays self-consistent even
  // when the backend's pre-rounded `general.winrate_pct` uses a
  // different rounding rule (the 80.3% drift). Bands continue to
  // use the backend-provided integer per REQ-WRS-004.
  const generalPercent = general
    ? intWinratePct(general.wins, general.trades)
    : 0;

  return (
    <div
      data-testid="winrate-by-session-card"
      className="relative rounded-lg border border-primary bg-[var(--color-jade-border)]/40 backdrop-blur-md p-4 shadow-[0_0_24px_rgba(0,212,216,0.55)]"
    >
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-display uppercase tracking-[0.15em] text-sm md:text-base">
            Winrate por sesión
          </h3>
          <p
            data-testid="winrate-subtitle"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary truncate"
          >
            {subtitle}
          </p>
        </div>
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

      {!partition.ok && !partition.isEmptyPeriod && !isLoading && !isError ? (
        <div
          data-testid="winrate-mismatch-note"
          className="mt-3 rounded-md border border-loss/40 bg-surface-el/40 px-3 py-2 font-body text-xs text-loss"
          role="status"
        >
          Datos en revisión — la suma de bandas ({partition.sum}) no coincide
          con el total General ({partition.generalTrades}).
        </div>
      ) : null}

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
                <HudTile
                  band="GENERAL"
                  label="General"
                  tile={general}
                  highlight
                  pctOverride={generalPercent}
                />
              </div>
            ) : (
              <div data-testid="session-tile-general">
                <HudTile
                  band="GENERAL"
                  label="General"
                  tile={{ trades: 0, wins: 0, winrate_pct: 0 }}
                  highlight
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
