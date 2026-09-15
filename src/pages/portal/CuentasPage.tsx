/*
 * p0d.3 / p0e.3 — Portal CuentasPage (real).
 *
 * FASE 4E-revive: el form inline de "Crear cuenta" se eliminó de esta
 * página. La creación ahora vive ÚNICAMENTE en el modal del FAB
 * (``<QuickActionModals>`` + ``<FloatingActionButton>``) para evitar
 * duplicar el mismo flujo en dos lugares. Esta página queda enfocada
 * en el listado y las acciones por fila (Fondear / Retirar / Eliminar).
 *
 * Render shape:
 *   - SeoHead "Mis cuentas" (noindex — portal surfaces don't rank)
 *   - H1 in Orbitron jade with glow (matches admin pages)
 *   - ErrorBanner for API failures
 *   - Stat strip driven by real aggregations from ``useTradesAll``,
 *     client-side filtered to the user's currently-active accounts so
 *     trades that belong to soft-deleted accounts never bleed in.
 *     Synthetic only as a fallback while the trade query is loading.
 *   - List section in a GlassCard con botones por fila (Fondear /
 *     Retirar / Eliminar). Empty state apunta al FAB del shell.
 *
 * Per mem #68, copy is Spanish. Per mem #70 the primary token is
 * the neon jade primary and the Orbitron display font is used for
 * headings.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Sparkline } from '../../components/trading/Sparkline';
import { seedSeries } from '../../components/trading/series';
import { StatCard } from '../../components/trading/StatCard';
import { FundWithdrawModal } from '../../components/portal/FundWithdrawModal';
import { DeleteAccountDialog } from '../../components/portal/DeleteAccountDialog';
import { useAccounts } from '../../features/accounts/hooks';
import { useTradesAll } from '../../features/trades/useTradesAll';
import {
  ACCOUNT_TYPE_BADGE,
  type AccountOut,
} from '../../features/accounts/types';
import type { ErrorEnvelope } from '../../features/auth/types';

function formatBalance(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function CuentasPage() {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data?.items ?? [];
  const loading = accountsQuery.isLoading;
  const queryError = accountsQuery.error as ErrorEnvelope | null;
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const queryClient = useQueryClient();

  // The FAB's quick actions (fund/withdraw/newAccount) are all
  // handled at the shell level by `<QuickActionModals>`, which owns
  // its own dialogs. CuentasPage doesn't need to react to the
  // quick-action store anymore.

  // FASE 2A — Per-row action modal state. Each modal carries the
  // account it's targeting (null while closed so we don't render an
  // unkeyed dialog).
  const [fundModal, setFundModal] = useState<{ open: boolean; account: AccountOut | null }>({
    open: false,
    account: null,
  });
  const [withdrawModal, setWithdrawModal] = useState<{
    open: boolean;
    account: AccountOut | null;
  }>({ open: false, account: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; account: AccountOut | null }>({
    open: false,
    account: null,
  });

  // After a successful fund/withdraw the backend returns the updated
  // account; we invalidate so the table re-renders with the new balance.
  const handleMoneySuccess = (_updated: AccountOut) => {
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    setFundModal({ open: false, account: null });
    setWithdrawModal({ open: false, account: null });
  };

  const closeFundModal = () => setFundModal({ open: false, account: null });
  const closeWithdrawModal = () => setWithdrawModal({ open: false, account: null });
  const closeDeleteModal = () => setDeleteModal({ open: false, account: null });

  const handleDeleted = () => {
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    setDeleteModal({ open: false, account: null });
  };

  // ---- Resumen de trading (stats cards).
  //
  // Real aggregations from ``useTradesAll`` (already user-scoped on
  // the backend). We filter client-side to the user's currently-
  // active accounts so trades that belong to soft-deleted accounts
  // never leak into the KPIs — the backend can't know which
  // accounts the UI considers "active", so this stays a client-side
  // concern. ``useTradesAll`` exposes ``isLoading`` for the future
  // skeleton branch; for now the values just render as zero while
  // the trade query is in flight, which is the same behaviour as the
  // synthetic block used to ship. ----
  const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance_usd || 0), 0);

  const tradesAllQuery = useTradesAll();
  const activeAccountIds = new Set(accounts.map((a) => a.id));
  const visibleTrades = tradesAllQuery.trades.filter((t) =>
    activeAccountIds.has(t.account_id),
  );

  // Operations count — every trade (open + closed) the user has on
  // their active accounts.
  const totalOperations = visibleTrades.length;

  // Closed trades only contribute P&L — OPEN trades carry ``pnl_usd
  // === null``. Same convention as ``useTradesAll.totalPnl`` so
  // header and table agree.
  const netPnl = visibleTrades.reduce(
    (acc, t) => (t.status === 'OPEN' ? acc : acc + Number(t.pnl_usd ?? 0)),
    0,
  );

  // Win / loss counts by terminal status. ``CLOSED_BREAK`` is
  // intentionally excluded from both buckets — the trade closed but
  // it wasn't a win OR a loss, so it shouldn't tilt the win-rate
  // ratio.
  const winningTrades = visibleTrades.filter((t) => t.status === 'CLOSED_WIN').length;
  const losingTrades = visibleTrades.filter((t) => t.status === 'CLOSED_LOSS').length;
  const decidedTrades = winningTrades + losingTrades;
  const winRate = decidedTrades === 0 ? 0 : Math.round((winningTrades / decidedTrades) * 100);

  // P&L as a percentage of the current balance — meaningful only
  // when there is a real balance to compare against. Without a
  // "vs. semana anterior" history endpoint the only honest delta is
  // "sobre balance".
  const netPnlPctText =
    totalBalance === 0
      ? '—'
      : `${netPnl >= 0 ? '+' : ''}${((netPnl / totalBalance) * 100).toFixed(1)}% sobre balance`;

  const displayedError = error ?? queryError;

  return (
    <>
      <SeoHead title="Mis cuentas" noindex />
      <div className="w-full px-2 md:px-4">
        <div className="py-4">
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            Resumen · Trading
          </span>
          <h1
            className="font-display uppercase tracking-wide text-2xl md:text-3xl mt-1"
            style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}
          >
            Mis cuentas
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base mt-2 max-w-2xl">
            Tus cuentas de trading. El balance arranca en USD 0 — lo sincronizamos cuando se conecte
            el modulo de balances.
          </p>

          <ErrorBanner error={displayedError} onDismiss={() => setError(null)} className="mt-4 mb-2" />
        </div>

        {/* Stat strip — resumen de trading. Real data from
            ``useTradesAll``, filtered to the active accounts so trades
            belonging to soft-deleted accounts never show up here. No
            "vs. semana anterior" delta yet — we'd need a historical
            endpoint to render it honestly. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
          <StatCard
            label="Balance total"
            value={formatBalance(String(totalBalance))}
            accent={totalBalance >= 0 ? 'jade' : 'loss'}
          />
          <StatCard
            label="Operaciones"
            value={String(totalOperations)}
            accent="jade"
            rightSlot={
              <Sparkline
                points={seedSeries(totalOperations || 1, 14)}
                width={56}
                height={18}
                accent="muted"
              />
            }
          />
          <StatCard
            label="P&L neto"
            value={formatBalance(String(netPnl))}
            delta={netPnlPctText}
            accent={netPnl >= 0 ? 'profit' : 'loss'}
          />
          <StatCard
            label="Win rate"
            value={`${winRate}%`}
            delta={`${winningTrades} gan. / ${losingTrades} per.`}
            accent={winRate >= 50 ? 'profit' : 'warning'}
          />
        </div>

        <section className="py-4">
          <h2 className="font-display uppercase tracking-wide text-base md:text-lg mb-3">
            Listado
          </h2>
          <GlassCard variant="default" className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th scope="col">Broker</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Moneda</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Creada</th>
                  <th scope="col" className="text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-text-muted font-body">
                      Cargando cuentas...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-text-muted font-body"
                    >
                      No tenés cuentas todavía. Usá el botón + (abajo a la derecha) para crear la primera.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => {
                    const badge = ACCOUNT_TYPE_BADGE[acc.type];
                    return (
                      <tr key={acc.id}>
                        <td>
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="block text-primary font-body hover:underline"
                          >
                            {acc.broker_name}
                          </Link>
                        </td>
                        <td>
                          <span
                            className={`inline-block border rounded-full px-2 py-0.5 text-xs font-display uppercase tracking-wide ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="block text-text-primary font-body hover:text-primary"
                          >
                            {acc.name}
                          </Link>
                        </td>
                        <td>
                          {/* Currency chip — every account ships in USD
                              today. When the backend adds multi-currency
                              support we read the value off the account
                              (CurrencyOut-style field) here. */}
                          <span
                            className="inline-flex items-center gap-1.5 border border-[rgba(0,255,157,0.35)] rounded-full px-2 py-0.5 text-xs font-display uppercase tracking-wide text-[#00FF9D]"
                            style={{ textShadow: '0 0 4px rgba(0,255,157,0.5)' }}
                            title="Moneda de la cuenta"
                          >
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
                              style={{ boxShadow: '0 0 4px #00FF9D' }}
                              aria-hidden="true"
                            />
                            USD
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="flex items-center gap-2 text-text-primary font-mono text-financial hover:text-primary font-medium"
                          >
                            <span>{formatBalance(acc.balance_usd)}</span>
                            {/* Mini sparkline de evolucion — dato sintetico
                                derivado del id de la cuenta hasta que el
                                modulo de trades envie historial real. */}
                            <Sparkline
                              points={seedSeries(Number(acc.balance_usd) || 1, 14)}
                              width={56}
                              height={18}
                              className="opacity-90 hidden sm:block"
                            />
                          </Link>
                        </td>
                        <td>
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="block text-text-muted font-mono text-financial text-xs hover:text-primary"
                          >
                            {formatDate(acc.created_at)}
                          </Link>
                        </td>
                        {/* FASE 2A — Per-row action buttons. Stop
                            propagation so clicking the button doesn't
                            bubble up through the row and trigger the
                            detail navigation wrapped around the cells. */}
                        <td>
                          <div
                            className="flex flex-wrap justify-end gap-1.5 md:gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              data-testid={`fund-${acc.id}`}
                              onClick={() => setFundModal({ open: true, account: acc })}
                              className="btn-cyber-jade px-2 py-1 rounded text-xs"
                            >
                              Fondear
                            </button>
                            <button
                              type="button"
                              data-testid={`withdraw-${acc.id}`}
                              onClick={() => setWithdrawModal({ open: true, account: acc })}
                              className="btn-cyber-jade border-[#F3B94E] text-[#F3B94E] [text-shadow:0_0_5px_rgba(243,185,78,0.5)] [box-shadow:0_0_10px_rgba(243,185,78,0.4),inset_0_0_10px_rgba(243,185,78,0.2)] hover:bg-[#F3B94E] hover:text-[#060B10] px-2 py-1 rounded text-xs"
                            >
                              Retirar
                            </button>
                            <button
                              type="button"
                              data-testid={`delete-${acc.id}`}
                              onClick={() => setDeleteModal({ open: true, account: acc })}
                              className="btn-cyber-jade border-[#FF2A55] text-[#FF2A55] [text-shadow:0_0_5px_rgba(255,42,85,0.5)] [box-shadow:0_0_10px_rgba(255,42,85,0.4),inset_0_0_10px_rgba(255,42,85,0.2)] hover:bg-[#FF2A55] hover:text-[#060B10] px-2 py-1 rounded text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </GlassCard>
        </section>
      </div>

      {fundModal.account ? (
        <FundWithdrawModal
          open={fundModal.open}
          mode="fund"
          account={fundModal.account}
          onClose={closeFundModal}
          onSuccess={handleMoneySuccess}
        />
      ) : null}

      {withdrawModal.account ? (
        <FundWithdrawModal
          open={withdrawModal.open}
          mode="withdraw"
          account={withdrawModal.account}
          onClose={closeWithdrawModal}
          onSuccess={handleMoneySuccess}
        />
      ) : null}

      {deleteModal.account ? (
        <DeleteAccountDialog
          open={deleteModal.open}
          account={deleteModal.account}
          onClose={closeDeleteModal}
          onDeleted={handleDeleted}
        />
      ) : null}
    </>
  );
}