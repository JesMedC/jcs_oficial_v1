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

  // No point showing a one-option picker — the dashboard already
  // auto-scopes to a single account.
  if (sorted.length <= 1) return null;

  const selectedLabel =
    value === null
      ? 'Todas las cuentas'
      : sorted.find((a) => a.id === value)?.name ?? 'Todas las cuentas';

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
          className="appearance-none cursor-pointer font-body text-sm pl-3 pr-8 py-1.5 rounded-md bg-[rgba(13,21,30,0.7)] border border-[rgba(0,255,157,0.35)] text-text-primary hover:border-[#00FF9D] focus:border-[#00FF9D] focus:outline-none focus:ring-2 focus:ring-[#00FF9D]/30 transition-colors"
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
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00FF9D]"
        >
          <polyline points="5 8 10 13 15 8" />
        </svg>
      </div>
      <span className="font-mono text-[11px] text-text-muted">
        {selectedLabel}
      </span>
    </div>
  );
}
