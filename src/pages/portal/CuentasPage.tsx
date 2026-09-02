/*
 * p0d.3 / p0e.3 — Portal CuentasPage (real).
 * portal-fase0a-base — migrated data fetching from useEffect+axios to
 *         TanStack Query via useAccounts(). The create-account form
 *         still uses a one-shot mutation so the form keeps working
 *         without rewriting the input bindings. After a successful
 *         create the ['accounts'] query is invalidated, the same way
 *         useCreateTrade invalidates after a new trade.
 *
 * FASE 2A — Per-row action buttons (Fondear / Retirar / Eliminar).
 * The list was previously a read-only nav: clicking any cell navigated
 * to /portal/cuentas/{id}. The user reported they could not deposit or
 * withdraw from the listing, so the table now exposes three buttons per
 * row that open the existing FundWithdrawModal (mode='fund'|'withdraw')
 * and DeleteAccountDialog. After a successful mutation we invalidate
 * ['accounts'] so the table re-renders with the new balance.
 *
 * Render shape:
 *   - SeoHead "Mis cuentas" (noindex — portal surfaces don't rank)
 *   - H1 in Orbitron jade with glow (matches admin pages)
 *   - ErrorBanner for API failures
 *   - Create form in a GlassCard (broker_name text, type select with
 *     BINARY/FOREX, name text) — submit disabled while in-flight
 *   - List section in a GlassCard with overflow-x-auto and a <table>;
 *     each row carries three action buttons (Fondear / Retirar /
 *     Eliminar) that open the corresponding modal. Empty state shows
 *     the "create the first one" hint.
 *
 * p0e.3: every cell wraps a <Link> to ``/portal/cuentas/{id}`` so the
 * whole row navigates to the new detail panel. The row also gets a
 * subtle jade hover tint (``bg-primary/5``) to signal it's clickable.
 *
 * Per mem #68, copy is Spanish. Per mem #70 the primary token is
 * jade #2EDC8C and the Orbitron display font is used for headings.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { FundWithdrawModal } from '../../components/portal/FundWithdrawModal';
import { DeleteAccountDialog } from '../../components/portal/DeleteAccountDialog';
import { createAccountApi } from '../../features/accounts/api';
import { useAccounts } from '../../features/accounts/hooks';
import {
  ACCOUNT_TYPE_BADGE,
  type AccountOut,
  type AccountTypeLiteral,
  type CreateAccountPayload,
} from '../../features/accounts/types';
import type { ErrorEnvelope } from '../../features/auth/types';

interface CreateFormState {
  readonly broker_name: string;
  readonly type: AccountTypeLiteral;
  readonly name: string;
}

const EMPTY_FORM: CreateFormState = {
  broker_name: '',
  type: 'BINARY',
  name: '',
};

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
  const [creating, setCreating] = useState<boolean>(false);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const queryClient = useQueryClient();

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

  const displayedError = error ?? queryError;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const broker = form.broker_name.trim();
    const name = form.name.trim();
    if (broker.length === 0 || name.length === 0) return;
    if (broker.length > 100 || name.length > 100) return;

    const payload: CreateAccountPayload = {
      broker_name: broker,
      type: form.type,
      name,
    };
    setCreating(true);
    try {
      await createAccountApi(payload);
      setForm(EMPTY_FORM);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } catch (err) {
      setError(err as ErrorEnvelope);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <SeoHead title="Mis cuentas" noindex />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1
          className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
          style={{ textShadow: '0 0 20px rgba(46,220,140,0.4)' }}
        >
          Mis cuentas
        </h1>
        <p className="text-text-secondary font-body text-sm md:text-base mt-4 max-w-2xl">
          Tus cuentas de trading. El balance arranca en USD 0 — lo sincronizamos cuando se conecte
          el modulo de balances.
        </p>

        <ErrorBanner error={displayedError} onDismiss={() => setError(null)} className="mt-6 mb-2" />

        <GlassCard variant="default" className="mt-6">
          <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg mb-4">
            Crear cuenta
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                Broker
              </span>
              <input
                type="text"
                value={form.broker_name}
                onChange={(e) => setForm((f) => ({ ...f, broker_name: e.target.value }))}
                maxLength={100}
                required
                placeholder="Pocket Option"
                className="w-full bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                Tipo
              </span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as AccountTypeLiteral }))
                }
                className="w-full bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="BINARY">Binary</option>
                <option value="FOREX">Forex</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                Nombre
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={100}
                required
                placeholder="Cuenta principal"
                className="w-full bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(46,220,140,0.5)] transition-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creando...' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        </GlassCard>

        <section className="mt-8">
          <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg mb-3">
            Listado
          </h2>
          <GlassCard variant="default" className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/60 text-text-muted font-display uppercase tracking-wide text-xs">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Broker
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Balance
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Creada
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
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
                      No tenés cuentas todavía. Creá la primera con el formulario.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => {
                    const badge = ACCOUNT_TYPE_BADGE[acc.type];
                    return (
                      <tr
                        key={acc.id}
                        className="border-t border-primary/10 hover:bg-primary/5 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="block text-primary font-body hover:underline"
                          >
                            {acc.broker_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="block hover:bg-primary/5 -mx-4 -my-3 px-4 py-3 rounded"
                          >
                            <span
                              className={`inline-block border rounded-full px-2 py-0.5 text-xs font-display uppercase tracking-wide ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="block text-text-primary font-body hover:text-primary"
                          >
                            {acc.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="block text-text-primary font-body hover:text-primary"
                          >
                            {formatBalance(acc.balance_usd)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/portal/cuentas/${acc.id}`}
                            className="block text-text-muted font-body text-xs hover:text-primary"
                          >
                            {formatDate(acc.created_at)}
                          </Link>
                        </td>
                        {/* FASE 2A — Per-row action buttons. Stop
                            propagation so clicking the button doesn't
                            bubble up through the row and trigger the
                            detail navigation wrapped around the cells. */}
                        <td className="px-4 py-3">
                          <div
                            className="flex justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              data-testid={`fund-${acc.id}`}
                              onClick={() => setFundModal({ open: true, account: acc })}
                              className="px-2 py-1 rounded border border-profit/40 text-profit text-xs font-display uppercase tracking-wide hover:bg-profit/10 transition-colors"
                            >
                              Fondear
                            </button>
                            <button
                              type="button"
                              data-testid={`withdraw-${acc.id}`}
                              onClick={() => setWithdrawModal({ open: true, account: acc })}
                              className="px-2 py-1 rounded border border-warning/40 text-warning text-xs font-display uppercase tracking-wide hover:bg-warning/10 transition-colors"
                            >
                              Retirar
                            </button>
                            <button
                              type="button"
                              data-testid={`delete-${acc.id}`}
                              onClick={() => setDeleteModal({ open: true, account: acc })}
                              className="px-2 py-1 rounded border border-loss/40 text-loss text-xs font-display uppercase tracking-wide hover:bg-loss/10 transition-colors"
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