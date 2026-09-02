/*
 * p0e.3 — Fund/Withdraw modal.
 *
 * Single component handles both fund and withdraw via the ``mode`` prop.
 * Renders inside the reusable <Modal> with:
 *   - single amount input with USD formatting hint
 *   - for withdraw: shows the available balance and disables submit when
 *     the entered amount exceeds it (frontend mirror of the backend
 *     ``INSUFFICIENT_BALANCE`` check at ``app.services.trading_account``)
 *   - Submit disabled while in-flight or invalid
 *   - On success: ``fundAccountApi`` / ``withdrawAccountApi`` →
 *     ``onSuccess(updatedAccount)`` → parent updates state and closes
 *
 * Spanish UI copy. Numbers use the same ``en-US`` USD formatter as
 * CuentasPage for visual consistency.
 */
import { useEffect, useMemo, useState } from 'react';

import { Modal } from './Modal';
import { ErrorBanner } from '../ErrorBanner';
import {
  fundAccountApi,
  withdrawAccountApi,
} from '../../features/accounts/api';
import type { AccountOut } from '../../features/accounts/types';
import type { ErrorEnvelope } from '../../features/auth/types';

interface FundWithdrawModalProps {
  readonly open: boolean;
  readonly mode: 'fund' | 'withdraw';
  readonly account: AccountOut;
  readonly onClose: () => void;
  readonly onSuccess: (updated: AccountOut) => void;
}

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
  // Mirror backend ``Numeric(10, 2)`` precision — at most 2 decimal places.
  return Math.round(n * 100) / 100;
}

export function FundWithdrawModal({
  open,
  mode,
  account,
  onClose,
  onSuccess,
}: FundWithdrawModalProps) {
  const [amountStr, setAmountStr] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<ErrorEnvelope | null>(null);

  const balance = useMemo(() => Number(account.balance_usd), [account.balance_usd]);
  const parsedAmount = useMemo(() => parseAmount(amountStr), [amountStr]);
  const exceedsBalance = mode === 'withdraw' && parsedAmount !== null && parsedAmount > balance;
  const valid = parsedAmount !== null && !exceedsBalance;

  // Reset transient state every time the modal opens or the target account
  // changes (so switching between accounts doesn't leak the previous input).
  useEffect(() => {
    if (open) {
      setAmountStr('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, account.id]);

  const title =
    mode === 'fund' ? `Fondear cuenta: ${account.name}` : `Retirar de: ${account.name}`;
  const submitLabel = mode === 'fund' ? 'Fondear' : 'Retirar';
  const submittingLabel = mode === 'fund' ? 'Fondeando...' : 'Retirando...';
  const isInvalid = amountStr.length > 0 && parsedAmount === null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid || submitting) return;
    const amount = parsedAmount;
    if (amount === null) return;

    setSubmitting(true);
    setError(null);
    try {
      const updated =
        mode === 'fund'
          ? await fundAccountApi(account.id, amount)
          : await withdrawAccountApi(account.id, amount);
      onSuccess(updated);
    } catch (err) {
      setError(err as ErrorEnvelope);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center justify-center border border-primary/30 text-primary font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="fund-withdraw-form"
            disabled={!valid || submitting}
            className="inline-flex items-center justify-center bg-primary text-bg font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
        </>
      }
    >
      <form id="fund-withdraw-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-text-secondary font-body text-sm">
          {mode === 'fund'
            ? 'Sumá saldo a tu cuenta. El backend acredita el monto y devuelve la fila actualizada.'
            : 'Retirá saldo de tu cuenta. No podés retirar más que el balance disponible.'}
        </p>

        {mode === 'withdraw' ? (
          <p className="text-text-muted font-body text-xs">
            Balance disponible: <span className="text-text-primary">{formatUsd(account.balance_usd)}</span>
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
            className="w-full bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
          <span className="text-text-muted font-body text-xs">
            Formato USD — máximo 2 decimales.
          </span>
        </label>

        {exceedsBalance ? (
          <p className="text-loss font-body text-xs">
            El monto excede el balance disponible ({formatUsd(account.balance_usd)}).
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
  );
}
