/*
 * FASE 4A / FASE 4E — TradeTable.
 *
 * Dense, monochrome-table log of the user's trades. Backed by the
 * ``useTrades`` hook (TanStack Query, ``placeholderData:
 * keepPreviousData``) so filter changes don't blank the table.
 *
 * FASE 4E: the table now also receives the ``scopedTrades`` (the
 * full set of trades matching the backend filters BEFORE the
 * client-side date filter) so we can compute the balance timeline
 * for *every* trade. Without that, the prev/post columns would
 * appear only on the visible date window and the numbers would
 * not match reality.
 *
 * Render states:
 *   - loading: text-only skeleton (no skeleton-row component yet —
 *     kept simple until the design system grows one in Ola 5).
 *   - error: friendly retry prompt with a ``text-loss`` accent.
 *   - empty: copy explaining the current filter combination.
 *   - ready: 13-column dense grid, sticky header, hover row tint.
 *
 * Column order:
 *   Fecha | Status | Tipo | Sesión | Instrumento | Dirección | Entrada
 *   | Salida | Tamaño | P&L | Bal. previo | Bal. post | R | Acción
 *
 * Ola 5: the last column ("Acción") hosts the inline close button
 * rendered by ``TradeTableRow`` for OPEN trades. FUND/WITHDRAW
 * rows render no action (they're already "settled" by definition).
 */
import { useMemo } from 'react';

import { useTrades } from './hooks';
import { TradeTableRow } from './TradeTableRow';
import { useAccounts } from '../accounts/hooks';
import type { AccountOut } from '../accounts/types';
import { computeBalanceTimeline } from './balanceTimeline';
import type { ListTradesParams } from './types';
import type { TradeOut } from './types';

interface Props {
  readonly filters?: ListTradesParams;
  /**
   * The full trade set as returned by the backend BEFORE the
   * client-side date filter is applied. Used to compute the
   * balance timeline so every row in the visible window has a
   * meaningful prev/post pair.
   */
  readonly tradesForBalance: ReadonlyArray<TradeOut>;
}

export function TradeTable({ filters = {}, tradesForBalance }: Props) {
  const { data, isLoading, isError } = useTrades(filters);
  const accountsQuery = useAccounts();
  const activeAccountIds = useMemo(() => {
    const ids = new Set<string>();
    for (const acc of accountsQuery.data?.items ?? []) {
      ids.add(acc.id);
    }
    return ids;
  }, [accountsQuery.data]);

  // Per-account balance timeline. The previous implementation used
  // a single ``currentBalance`` (sum of all accounts) for every row,
  // which produced wrong ``bal.prev``/``bal.post`` when the user
  // filtered by a single account — e.g. an account with $100 would
  // show ``prev = $535.95`` because the timeline walked back from
  // the global balance. Now we anchor each account's timeline on
  // its own current ``balance_usd`` and merge into a single lookup.
  const balanceTimeline = useMemo(() => {
    const accounts = accountsQuery.data?.items ?? [];
    const byAccountId = new Map<string, TradeOut[]>();
    for (const t of tradesForBalance) {
      const arr = byAccountId.get(t.account_id);
      if (arr === undefined) {
        byAccountId.set(t.account_id, [t]);
      } else {
        arr.push(t);
      }
    }
    const merged = new Map<string, { prev: number; post: number }>();
    for (const [accountId, accountTrades] of byAccountId) {
      const account = accounts.find((a) => a.id === accountId);
      const anchor = account ? Number(account.balance_usd) : 0;
      const timeline = computeBalanceTimeline(accountTrades, anchor);
      for (const [tradeId, pair] of timeline) {
        merged.set(tradeId, pair);
      }
    }
    return merged;
  }, [tradesForBalance, accountsQuery.data]);

  // Lookup table for the per-row "Cuenta" column. Built once per
  // ``accounts`` change so each row can do an O(1) ``.get`` instead
  // of scanning the full account list.
  const accountsById = useMemo(() => {
    const map = new Map<string, AccountOut>();
    for (const acc of accountsQuery.data?.items ?? []) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accountsQuery.data]);

  if (isLoading) {
    return (
      <div
        data-testid="trade-table-loading"
        className="p-8 text-center text-text-secondary"
      >
        Cargando operaciones…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="trade-table-error"
        className="p-8 text-center text-loss"
      >
        Error al cargar operaciones. Reintentá.
      </div>
    );
  }

  const items = (data?.items ?? []).filter((t) => activeAccountIds.has(t.account_id));

  if (items.length === 0) {
    return (
      <div
        data-testid="trade-table-empty"
        className="p-8 text-center text-text-secondary"
      >
        No hay operaciones para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-primary/20">
      <table className="w-full font-mono text-sm" data-testid="trade-table">
        <thead className="bg-surface/60 border-b border-primary/20">
          <tr className="text-xs uppercase tracking-wide text-text-secondary">
            <th className="px-3 py-2 text-left">Fecha</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Sesión</th>
            <th className="px-3 py-2 text-left">Instrumento</th>
            <th className="px-3 py-2 text-left">Dirección</th>
            <th className="px-3 py-2 text-right">Entrada</th>
            <th className="px-3 py-2 text-right">Salida</th>
            <th className="px-3 py-2 text-right">Tamaño</th>
            <th className="px-3 py-2 text-right">P&amp;L</th>
            <th className="px-3 py-2 text-left">Cuenta</th>
            <th className="px-3 py-2 text-right">Bal. previo</th>
            <th className="px-3 py-2 text-right">Bal. post</th>
            <th className="px-3 py-2 text-right">R</th>
            <th className="px-3 py-2 text-right">Acción</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <TradeTableRow
              key={t.id}
              trade={t}
              balance={balanceTimeline.get(t.id) ?? null}
              accountsById={accountsById}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
