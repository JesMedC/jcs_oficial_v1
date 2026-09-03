/*
 * FASE 4A / Ola 5 — CloseTradeModal.
 *
 * Glass modal that closes an OPEN trade. Two visual branches driven
 * by ``trade.type``:
 *
 *   - FOREX: number input for ``exit_price`` (the user typed price
 *     drives the backend P&L calculation). The current entry_price
 *     and direction are echoed as a hint.
 *   - BINARY: 2-way radio for ``outcome`` (WIN / LOSS). The backend
 *     computes CLOSED_BREAK from payout so BREAK is not a wire-level
 *     outcome — we mirror that and only expose the two the user
 *     decides on.
 *
 * The journal triple (``post_trade_notes``, ``followed_plan``,
 * ``mistakes``) is shared between branches and round-trips through
 * the backend unchanged.
 *
 * Split into ``CloseTradeModal`` (public, picks branch) and
 * ``CloseForexForm`` / ``CloseBinaryForm`` (each owns its own
 * ``useForm`` typed to its own branch). This sidesteps
 * ``exactOptionalPropertyTypes`` friction with discriminated-union
 * ``useForm`` generics — each form is monomorphic. The journal
 * triple is inlined in each branch (RHF's ``UseFormRegister`` is
 * invariant across field shapes, so extracting it generically would
 * require an ``any`` cast).
 *
 * The form schemas (``schemas.ts``) keep ``type`` as the Zod
 * discriminator for branching, but ``type`` is NOT forwarded to the
 * backend — ``TradeCloseIn`` has ``model_config=extra="forbid"`` and
 * the discriminator is the trade's own ``type`` already loaded
 * server-side. Both ``onSubmit`` handlers destructure ``type`` out
 * of the form values before passing to ``closeMutation.mutate`` so
 * the wire payload matches ``CloseTradePayload``.
 *
 * data-testid hooks:
 *   - close-trade-modal: the form root.
 *   - close-exit-price / close-outcome-{WIN,LOSS}: type-specific.
 *   - close-post-notes / close-followed-plan / close-mistakes:
 *     journal triple.
 *   - close-cancel / close-submit: footer actions.
 *   - close-error: rendered only when the mutation rejects.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type ReactNode } from 'react';

import { GlassModal } from '../../components/common/GlassModal';

import { formatNumber } from './format';
import {
  CloseBinaryPayloadSchema,
  CloseForexPayloadSchema,
  type CloseBinaryFormValues,
  type CloseForexFormValues,
} from './schemas';
import type { CloseTradePayload, TradeOut } from './types';
import { useCloseTrade } from './useCloseTrade';

interface Props {
  readonly trade: TradeOut | null;
  readonly onClose: () => void;
}

export function CloseTradeModal({ trade, onClose }: Props) {
  if (!trade) return null;
  return trade.type === 'FOREX' ? (
    <CloseForexForm trade={trade} onClose={onClose} />
  ) : (
    <CloseBinaryForm trade={trade} onClose={onClose} />
  );
}

function CloseForexForm({ trade, onClose }: { readonly trade: TradeOut; readonly onClose: () => void }) {
  const closeMutation = useCloseTrade();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CloseForexFormValues>({
    resolver: zodResolver(CloseForexPayloadSchema),
    defaultValues: {
      type: 'FOREX',
      exit_price: '',
      post_trade_notes: '',
      followed_plan: false,
      mistakes: '',
    },
  });

  const onSubmit = (data: CloseForexFormValues) => {
    // Strip the form-only `type` discriminator before forwarding.
    // The backend's TradeCloseIn has extra="forbid" and the type
    // is redundant — it already knows trade.type from the loaded row.
    const { type: _type, ...payload } = data;
    void _type;
    closeMutation.mutate(
      { id: trade.id, payload: payload as CloseTradePayload },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <GlassModal
      open
      onClose={onClose}
      title={`Cerrar trade — ${trade.pair ?? trade.instrument}`}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        data-testid="close-trade-modal"
        className="flex flex-col gap-4"
      >
        <Field label="Precio de salida" error={errors.exit_price?.message}>
          <input
            type="number"
            step="0.0001"
            data-testid="close-exit-price"
            className="w-full bg-bg border border-primary/30 rounded px-3 py-2 font-mono"
            placeholder={trade.entry_price ?? ''}
            {...register('exit_price')}
          />
        </Field>
        <p className="text-xs text-text-secondary">
          Entrada actual: {formatNumber(trade.entry_price)} · dirección{' '}
          {trade.direction ?? '—'}
        </p>

        <Field label="Notas post-trade (opcional)" error={errors.post_trade_notes?.message}>
          <textarea
            data-testid="close-post-notes"
            rows={3}
            className="w-full bg-bg border border-primary/30 rounded px-3 py-2 text-sm"
            {...register('post_trade_notes')}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            data-testid="close-followed-plan"
            className="rounded border-primary/30"
            {...register('followed_plan')}
          />
          <span>Seguí mi plan</span>
        </label>

        <Field label="Errores / aprendizajes (opcional)" error={errors.mistakes?.message}>
          <textarea
            data-testid="close-mistakes"
            rows={2}
            className="w-full bg-bg border border-primary/30 rounded px-3 py-2 text-sm"
            {...register('mistakes')}
          />
        </Field>

        {closeMutation.isError ? (
          <div data-testid="close-error" className="text-loss text-sm">
            Error al cerrar: {closeMutation.error?.message ?? 'desconocido'}
          </div>
        ) : null}

        <FormFooter
          onClose={onClose}
          isSubmitting={isSubmitting}
          isPending={closeMutation.isPending}
        />
      </form>
    </GlassModal>
  );
}

function CloseBinaryForm({ trade, onClose }: { readonly trade: TradeOut; readonly onClose: () => void }) {
  const closeMutation = useCloseTrade();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CloseBinaryFormValues>({
    resolver: zodResolver(CloseBinaryPayloadSchema),
    defaultValues: {
      type: 'BINARY',
      outcome: 'WIN',
      post_trade_notes: '',
      followed_plan: false,
      mistakes: '',
    },
  });

  const onSubmit = (data: CloseBinaryFormValues) => {
    // Strip the form-only `type` discriminator before forwarding.
    // The backend's TradeCloseIn has extra="forbid" and the type
    // is redundant — it already knows trade.type from the loaded row.
    const { type: _type, ...payload } = data;
    void _type;
    closeMutation.mutate(
      { id: trade.id, payload: payload as CloseTradePayload },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <GlassModal
      open
      onClose={onClose}
      title={`Cerrar trade — ${trade.instrument}`}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        data-testid="close-trade-modal"
        className="flex flex-col gap-4"
      >
        <Field label="Resultado" error={errors.outcome?.message}>
          <div className="flex gap-2">
            {(['WIN', 'LOSS'] as const).map((opt) => (
              <label key={opt} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  value={opt}
                  data-testid={`close-outcome-${opt}`}
                  className="peer sr-only"
                  {...register('outcome')}
                />
                <div
                  className={`text-center py-2 rounded border font-display uppercase text-sm tracking-wide border-primary/20 text-text-secondary ${
                    opt === 'WIN'
                      ? 'peer-checked:border-profit peer-checked:bg-profit/10 peer-checked:text-profit'
                      : 'peer-checked:border-loss peer-checked:bg-loss/10 peer-checked:text-loss'
                  }`}
                >
                  {opt}
                </div>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Notas post-trade (opcional)" error={errors.post_trade_notes?.message}>
          <textarea
            data-testid="close-post-notes"
            rows={3}
            className="w-full bg-bg border border-primary/30 rounded px-3 py-2 text-sm"
            {...register('post_trade_notes')}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            data-testid="close-followed-plan"
            className="rounded border-primary/30"
            {...register('followed_plan')}
          />
          <span>Seguí mi plan</span>
        </label>

        <Field label="Errores / aprendizajes (opcional)" error={errors.mistakes?.message}>
          <textarea
            data-testid="close-mistakes"
            rows={2}
            className="w-full bg-bg border border-primary/30 rounded px-3 py-2 text-sm"
            {...register('mistakes')}
          />
        </Field>

        {closeMutation.isError ? (
          <div data-testid="close-error" className="text-loss text-sm">
            Error al cerrar: {closeMutation.error?.message ?? 'desconocido'}
          </div>
        ) : null}

        <FormFooter
          onClose={onClose}
          isSubmitting={isSubmitting}
          isPending={closeMutation.isPending}
        />
      </form>
    </GlassModal>
  );
}

function FormFooter({
  onClose,
  isSubmitting,
  isPending,
}: {
  readonly onClose: () => void;
  readonly isSubmitting: boolean;
  readonly isPending: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 mt-2">
      <button
        type="button"
        data-testid="close-cancel"
        onClick={onClose}
        className="px-4 py-2 rounded border border-primary/30 text-text-secondary hover:border-primary/60"
      >
        Cancelar
      </button>
      <button
        type="submit"
        data-testid="close-submit"
        disabled={isSubmitting || isPending}
        className="px-4 py-2 rounded bg-primary text-bg font-display uppercase tracking-wide hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Cerrando…' : 'Cerrar trade'}
      </button>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  readonly label: string;
  readonly error?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label className="text-xs uppercase tracking-wide text-text-secondary">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <span className="text-xs text-loss">{error}</span> : null}
    </div>
  );
}