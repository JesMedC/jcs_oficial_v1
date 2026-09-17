/*
 * AccountSelector — dashboard scope picker.
 *
 * Single-select dropdown that lets the user scope the dashboard
 * analytics to a specific account or to all active accounts. Lives
 * at the top of the dashboard so every panel below it (cashflow,
 * equity curve, market distribution, etc.) recomputes against the
 * selected scope.
 *
 * "All accounts" is the implicit default — when no account is picked
 * the hook aggregates across every account the user owns. Picking
 * one filters the trades + cashflow down to that single account.
 *
 * Hidden when the user has a single active account (no point in
 * showing a one-item dropdown).
 */
import { useAccounts } from '../../features/accounts/hooks';

interface Props {
  /** Current selection — `null` means "all accounts". */
  readonly value: string | null;
  readonly onChange: (accountId: string | null) => void;
}

function formatUsd(n: string): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return n;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

export function AccountSelector({ value, onChange }: Props) {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data?.items ?? [];

  // Sort by created_at asc so the order is stable across renders.
  // TanStack Query returns a fresh array reference each render even
  // when the data is identical, so we sort inline (cheap, length
  // <= a handful of accounts in the realistic case).
  const sorted = accounts
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Always render — even with one account, the explicit
  // "Todas las cuentas" choice matters for analytics like the equity
  // curve (where "all" == "single" with one account, but the user
  // still benefits from seeing the scope they have). FASE 6 lesson:
  // the auto-hide was hiding the scope picker exactly when the user
  // most needed to confirm it.
  // if (sorted.length <= 1) return null;

  return (
    <div
      data-testid="dash-account-selector"
      className="flex items-center gap-3 flex-wrap"
    >
      <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
        Alcance
      </span>
<div className="relative">
        <select
          data-testid="dash-account-selector-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          className="appearance-none cursor-pointer font-body text-sm pl-3 pr-8 py-1.5 rounded-md bg-transparent border border-[#00E5FF] text-[#00E5FF] hover:bg-[rgba(0,229,255,0.1)] hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[#00E5FF]/30 transition-all duration-200"
        >
          <option value="">Todas las cuentas</option>
          {sorted.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} · {acc.type} · {formatUsd(acc.balance_usd)}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00E5FF]"
        >
          <polyline points="5 8, 10 13, 15 8" />
        </svg>
      </div>
      {/*
       * dashboard-jarvis-fidelity (Slice A, T-036, REQ-CWM-006) —
       * the trailing `<span className="font-mono text-[11px]">`
       * caption duplicating the selected option is gone. The
       * `<select>` already shows the chosen label and the chrome
       * "Alcance" label + chevron anchor the control.
       */}
    </div>
  );
}
