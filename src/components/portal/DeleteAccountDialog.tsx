/*
 * p0e.3 — Delete account confirmation dialog.
 *
 * Renders a <Modal> that asks the user to type the literal word
 * ``ELIMINAR`` (case-sensitive, exact match) before the destructive
 * button enables. Mirrors the backend ``DeleteIn.confirmation``
 * validator in ``app.schemas.trading_account.DeleteIn`` (which
 * expects ``confirmation == "ELIMINAR"``).
 *
 * Soft-delete preserves the trade history (the backend keeps the row
 * with ``deleted_at`` populated; audit log + journal remain) — the
 * warning copy reflects this so users understand nothing is lost.
 *
 * On success: ``deleteAccountApi(id, "ELIMINAR")`` → ``onDeleted()`` →
 * parent navigates back to ``/portal/cuentas``.
 *
 * Spanish copy.
 */
import { useEffect, useState } from 'react';

import { Modal } from './Modal';
import { ErrorBanner } from '../ErrorBanner';
import { deleteAccountApi } from '../../features/accounts/api';
import type { AccountOut } from '../../features/accounts/types';
import type { ErrorEnvelope } from '../../features/auth/types';

interface DeleteAccountDialogProps {
  readonly open: boolean;
  readonly account: AccountOut;
  readonly onClose: () => void;
  readonly onDeleted: () => void;
}

const CONFIRMATION_WORD = 'ELIMINAR';

export function DeleteAccountDialog({
  open,
  account,
  onClose,
  onDeleted,
}: DeleteAccountDialogProps) {
  const [typed, setTyped] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<ErrorEnvelope | null>(null);

  // Reset on open / account change.
  useEffect(() => {
    if (open) {
      setTyped('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, account.id]);

  const matches = typed === CONFIRMATION_WORD;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!matches || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteAccountApi(account.id, CONFIRMATION_WORD);
      onDeleted();
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
      title={`Eliminar cuenta: ${account.name}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center justify-center border border-primary/30 text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="delete-account-form"
            disabled={!matches || submitting}
            className="inline-flex items-center justify-center bg-loss text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(255,92,92,0.5)] transition-shadow text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Eliminando...' : `Eliminar cuenta "${account.name}"`}
          </button>
        </>
      }
    >
      <form id="delete-account-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-text-primary font-body text-sm">
          Esta acción no se puede deshacer. La cuenta será removida pero tu historial de
          operaciones se preserva para tu journal.
        </p>

        <label className="flex flex-col gap-1">
          <span className="font-display uppercase tracking-wide text-xs text-text-muted">
            Escribí ELIMINAR para confirmar
          </span>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="ELIMINAR"
            autoComplete="off"
            spellCheck={false}
            disabled={submitting}
            className="w-full bg-surface-el/50 border border-loss/40 rounded-lg px-3 py-2 text-text-primary font-body focus:border-loss focus:outline-none focus:ring-2 focus:ring-loss/40 disabled:opacity-60"
          />
        </label>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />
      </form>
    </Modal>
  );
}
