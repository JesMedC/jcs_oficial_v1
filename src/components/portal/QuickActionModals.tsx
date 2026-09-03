/*
 * Cyber-Jade — QuickActionModals.
 *
 * Shell-level glue that turns the FAB's quick-action signals
 * (``useQuickAction.request('fund' | 'withdraw' | 'newAccount')``)
 * into fully working flows:
 *
 *   - 'fund' / 'withdraw' → opens a dialog with an account picker +
 *     amount input, then submits through fundAccountApi /
 *     withdrawAccountApi.
 *   - 'newAccount'        → opens a fast account-creation form
 *     (broker + type + name) that calls createAccountApi and
 *     invalidates the accounts list on success.
 *
 * The shell owns this so every /portal/* page can trigger the flow
 * without mounting per-page state. Behaviour:
 *   - Watches `useQuickAction.pending`. When it flips to any of the
 *     three actions, opens the matching dialog with sensible
 *     defaults pre-set.
 *   - Pre-selects the first active account for fund/withdraw so the
 *     user only has to confirm the amount (or switch accounts via
 *     the picker).
 *   - Closes + consumes the signal on close so it doesn't re-open
 *     on re-render.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Modal } from './Modal';
import { ErrorBanner } from '../ErrorBanner';
import { useAccounts } from '../../features/accounts/hooks';
import {
  createAccountApi,
  fundAccountApi,
  withdrawAccountApi,
} from '../../features/accounts/api';
import type {
  AccountTypeLiteral,
  CreateAccountPayload,
} from '../../features/accounts/types';
import type { ErrorEnvelope } from '../../features/auth/types';
import { useQuickAction } from '../../stores/useQuickAction';

type MoneyMode = 'fund' | 'withdraw';

const TITLES: Record<MoneyMode, (accountName: string) => string> = {
  fund: (name) => `Fondear cuenta: ${name}`,
  withdraw: (name) => `Retirar de: ${name}`,
};

const SUBMIT_LABELS: Record<MoneyMode, [string, string]> = {
  fund: ['Fondear', 'Fondeando...'],
  withdraw: ['Retirar', 'Retirando...'],
};

function formatUsd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function parseAmount(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export function QuickActionModals() {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data?.items ?? [];
  const pending = useQuickAction((s) => s.pending);
  const consume = useQuickAction((s) => s.consume);
  const queryClient = useQueryClient();

  // Money dialog state ----------------------------------------------------
  const [mode, setMode] = useState<MoneyMode | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<ErrorEnvelope | null>(null);

  // New account dialog state ---------------------------------------------
  const [newAccountOpen, setNewAccountOpen] = useState<boolean>(false);
  const [newBroker, setNewBroker] = useState<string>('');
  const [newType, setNewType] = useState<AccountTypeLiteral>('BINARY');
  const [newName, setNewName] = useState<string>('');
  const [creatingAccount, setCreatingAccount] = useState<boolean>(false);
  const [createError, setCreateError] = useState<ErrorEnvelope | null>(null);

  // React to a fund/withdraw quick-action landing.
  useEffect(() => {
    if (pending !== 'fund' && pending !== 'withdraw') return;
    setMode(pending);
    setAmountStr('');
    setError(null);
    setSubmitting(false);
    const firstId = accounts[0]?.id ?? '';
    setSelectedAccountId(firstId);
    consume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // React to a newAccount quick-action landing.
  useEffect(() => {
    if (pending !== 'newAccount') return;
    setNewBroker('');
    setNewType('BINARY');
    setNewName('');
    setCreateError(null);
    setCreatingAccount(false);
    setNewAccountOpen(true);
    consume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const parsedAmount = parseAmount(amountStr);
  const balance = selectedAccount ? Number(selectedAccount.balance_usd) : 0;
  const exceedsBalance =
    mode === 'withdraw' &&
    selectedAccount !== null &&
    parsedAmount !== null &&
    parsedAmount > balance;
  const valid =
    mode !== null &&
    selectedAccount !== null &&
    parsedAmount !== null &&
    !exceedsBalance;
  const isInvalid = amountStr.length > 0 && parsedAmount === null;

  const closeMoney = () => {
    setMode(null);
    setAmountStr('');
    setError(null);
    setSubmitting(false);
  };

  const closeNewAccount = () => {
    setNewAccountOpen(false);
    setNewBroker('');
    setNewName('');
    setNewType('BINARY');
    setCreateError(null);
    setCreatingAccount(false);
  };

  const handleMoneySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid || mode === null || selectedAccount === null) return;
    const amount = parsedAmount;
    if (amount === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated =
        mode === 'fund'
          ? await fundAccountApi(selectedAccount.id, amount)
          : await withdrawAccountApi(selectedAccount.id, amount);
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void updated; // discarded — invalidation refreshes everything
      closeMoney();
    } catch (err) {
      setError(err as ErrorEnvelope);
    } finally {
      setSubmitting(false);
    }
  };

  const trimmedBroker = newBroker.trim();
  const trimmedName = newName.trim();
  const brokerValid = trimmedBroker.length > 0 && trimmedBroker.length <= 100;
  const nameValid = trimmedName.length > 0 && trimmedName.length <= 100;
  const createValid = brokerValid && nameValid;

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!createValid || creatingAccount) return;
    setCreatingAccount(true);
    setCreateError(null);
    const payload: CreateAccountPayload = {
      broker_name: trimmedBroker,
      type: newType,
      name: trimmedName,
    };
    try {
      await createAccountApi(payload);
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      closeNewAccount();
    } catch (err) {
      setCreateError(err as ErrorEnvelope);
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <>
      {/* ----- Money dialog (fund / withdraw) ----- */}
      {mode !== null ? (
        <Modal
          open
          onClose={closeMoney}
          title={selectedAccount ? TITLES[mode](selectedAccount.name) : 'Selecciona una cuenta'}
          footer={
            <>
              <button
                type="button"
                onClick={closeMoney}
                disabled={submitting}
                className="btn-cyber-jade px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="quick-fund-withdraw-form"
                disabled={!valid || submitting}
                className="btn-cyber-jade px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? SUBMIT_LABELS[mode][1] : SUBMIT_LABELS[mode][0]}
              </button>
            </>
          }
        >
          <form
            id="quick-fund-withdraw-form"
            onSubmit={handleMoneySubmit}
            className="space-y-4"
          >
            <p className="text-text-secondary font-body text-sm">
              {mode === 'fund'
                ? 'Sumá saldo a la cuenta que elijas. El backend acredita el monto y devuelve la fila actualizada.'
                : 'Retirá saldo de la cuenta que elijas. No podés retirar más que el balance disponible.'}
            </p>

            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                Cuenta
              </span>
              {accounts.length === 1 && selectedAccount ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(13,21,30,0.7)] border border-[rgba(0,255,157,0.25)]">
                  <span className="inline-flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-[rgba(0,255,157,0.15)] text-[#00FF9D] font-display text-[10px]">
                    {selectedAccount.type === 'BINARY' ? 'B' : 'F'}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-display text-sm text-text-primary truncate">
                      {selectedAccount.name}
                    </span>
                    <span className="font-mono text-xs text-text-muted">
                      {formatUsd(selectedAccount.balance_usd)}
                    </span>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  disabled={submitting}
                  className="w-full font-body disabled:opacity-60"
                >
                  {accounts.length === 0 ? (
                    <option value="">No tenés cuentas todavía</option>
                  ) : (
                    accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} · {acc.type} · {formatUsd(acc.balance_usd)}
                      </option>
                    ))
                  )}
                </select>
              )}
            </label>

            {mode === 'withdraw' && selectedAccount !== null ? (
              <p className="text-text-muted font-body text-xs">
                Balance disponible:{' '}
                <span className="text-text-primary">{formatUsd(selectedAccount.balance_usd)}</span>
              </p>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                Monto (USD)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
                className="w-full font-body focus:outline-none disabled:opacity-60"
              />
              <span className="text-text-muted font-body text-xs">
                Formato USD — máximo 2 decimales.
              </span>
            </label>

            {exceedsBalance ? (
              <p className="text-loss font-body text-xs">
                El monto excede el balance disponible (
                {formatUsd(selectedAccount?.balance_usd ?? '0')}).
              </p>
            ) : null}

            {isInvalid ? (
              <p className="text-loss font-body text-xs">
                Ingresá un monto válido mayor a 0.
              </p>
            ) : null}

            <ErrorBanner error={error} onDismiss={() => setError(null)} />
          </form>
        </Modal>
      ) : null}

      {/* ----- New account dialog ----- */}
      {newAccountOpen ? (
        <Modal
          open
          onClose={closeNewAccount}
          title="Crear cuenta"
          footer={
            <>
              <button
                type="button"
                onClick={closeNewAccount}
                disabled={creatingAccount}
                className="btn-cyber-jade px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="quick-create-account-form"
                disabled={!createValid || creatingAccount}
                className="btn-cyber-jade px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingAccount ? 'Creando...' : 'Crear cuenta'}
              </button>
            </>
          }
        >
          <form
            id="quick-create-account-form"
            onSubmit={handleCreateSubmit}
            className="space-y-4"
          >
            <p className="text-text-secondary font-body text-sm">
              Sumá una cuenta de trading con su broker, tipo y nombre. El
              balance arranca en USD 0.
            </p>

            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                Broker
              </span>
              <input
                type="text"
                value={newBroker}
                onChange={(e) => setNewBroker(e.target.value)}
                maxLength={100}
                required
                placeholder="Pocket Option"
                disabled={creatingAccount}
                className="w-full font-body focus:outline-none disabled:opacity-60"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                Tipo
              </span>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as AccountTypeLiteral)}
                disabled={creatingAccount}
                className="w-full font-body disabled:opacity-60"
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
                required
                placeholder="Cuenta principal"
                disabled={creatingAccount}
                className="w-full font-body focus:outline-none disabled:opacity-60"
              />
            </label>

            <ErrorBanner error={createError} onDismiss={() => setCreateError(null)} />
          </form>
        </Modal>
      ) : null}
    </>
  );
}
