/*
 * portal-fase0a-base — NewTradeForm.
 *
 * RHF + Zod resolver over the discriminated TradeFormSchema. Fields
 * change based on whether the user has a FOREX account or a BINARY
 * account selected — the form narrows on ``type``. On valid submit it
 * hands the parsed payload to useCreateTrade.mutate(...) which does
 * the POST + invalidation dance.
 *
 * FASE 4A / Ola 6 — Journal guard rail.
 *
 * When both `pre_trade_notes` and `emotional_tags` are empty, the
 * first submit attempt does NOT call the mutation directly — it
 * surfaces the `DisciplineSoftBlock` and waits. The user can either
 * add a note (focus the textarea) or confirm the skip, which
 * re-triggers the submit and lands on the wire. The block is SOFT:
 * the user always retains the final say on whether to save.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAccounts } from '../accounts/hooks';
import { TradeFormSchema, type TradeFormValues } from './schemas';
import { useCreateTrade } from './useCreateTrade';
import { DisciplineSoftBlock } from './DisciplineSoftBlock';
import { EmotionalTagsChips } from './EmotionalTagsChips';
import type { EmotionalTag } from './types';

export interface NewTradeFormProps {
  readonly onSuccess?: () => void;
  readonly onError?: (code: string, message: string) => void;
}

export function NewTradeForm({ onSuccess, onError }: NewTradeFormProps) {
  const { data: accountsData } = useAccounts();
  const createTrade = useCreateTrade({
    onSuccess: () => onSuccess?.(),
    onError: (err) => {
      const envelope = err as { code?: string; message?: string };
      onError?.(envelope.code ?? 'UNKNOWN', envelope.message ?? 'Error al crear el trade');
    },
  });

  // useMemo stabilizes the array reference across renders so the
  // useEffect below does not re-fire when the query result is the same.
  const accounts = useMemo(() => accountsData?.items ?? [], [accountsData?.items]);
  const firstAccount = accounts[0];

  // RHF's discriminated-union errors type is widened; the per-branch field
  // accesses in the JSX below are guarded by `selectedType === 'FOREX'`
  // and `selectedType === 'BINARY'` narrowing at render time so we keep
  // `errors` typed as `FieldErrors<TradeFormValues>` and let the
  // narrowing happen naturally inside each block.
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TradeFormValues>({
    resolver: zodResolver(TradeFormSchema),
    defaultValues: {
      account_id: firstAccount?.id ?? '',
      type: (firstAccount?.type === 'BINARY' ? 'BINARY' : 'FOREX') as 'BINARY' | 'FOREX',
      pair: 'EURUSD',
      direction: 'LONG' as const,
      entry_price: '1',
      lot_size: '0.1',
      stop_loss: '',
      take_profit: '',
      pre_trade_notes: '',
      emotional_tags: [],
    } as unknown as TradeFormValues,
  });

  // FASE 4A / Ola 6 — Journal-aware submit intercept.
  // `emotionalTags` lives outside RHF on purpose: the chip selector
  // is a controlled component and RHF's value-as-string model would
  // mangle the array. `showSoftBlock` is the visibility flag for the
  // amber banner — once raised we skip the intercept on re-submit
  // (user has already acknowledged by clicking "Guardar igual").
  const [emotionalTags, setEmotionalTags] = useState<EmotionalTag[]>([]);
  const [showSoftBlock, setShowSoftBlock] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const selectedType = watch('type');
  const watchedAccountId = watch('account_id');

  // When the user switches account, mirror the account type.
  useEffect(() => {
    const account = accounts.find((a) => a.id === watchedAccountId);
    if (account && account.type !== selectedType) {
      setValue('type', account.type);
      if (account.type === 'BINARY') {
        setValue('investment_usd', '25');
        setValue('payout_pct', '85');
        setValue('expiration_seconds', 60);
        setValue('direction', 'CALL');
      } else {
        setValue('pair', 'EURUSD');
        setValue('direction', 'LONG');
        setValue('entry_price', '1');
        setValue('lot_size', '0.1');
      }
    }
  }, [watchedAccountId, accounts, setValue, selectedType]);

  if (accounts.length === 0) {
    return (
      <div className="text-text-secondary font-body text-sm" data-testid="new-trade-no-accounts">
        Necesitas al menos una cuenta para crear un trade.
      </div>
    );
  }

  const handleSubmitClick: SubmitHandler<TradeFormValues> = (values) => {
    // Soft-block intercept. When the journal is empty AND the user
    // has not already acknowledged the warning in this submit cycle,
    // we raise the banner and bail. The re-submit path (triggered by
    // the "Guardar igual" button) sets `showSoftBlock` to false but
    // the closure here still observes `showSoftBlock === true`, so
    // `!showSoftBlock` is false and we fall through to the mutate.
    // That keeps the flow simple and the block genuinely SOFT.
    const notesEmpty = (values.pre_trade_notes ?? '').trim() === '';
    const tagsEmpty = emotionalTags.length === 0;
    if (notesEmpty && tagsEmpty && !showSoftBlock) {
      setShowSoftBlock(true);
      return;
    }

    // The backend CreateTradeIn expects `instrument` alongside the
    // discriminated-union specific fields. We derive it from `pair`
    // (FOREX) or fall back to the literal "BINARY" so the create
    // payload matches the wire format exactly.
    const instrument = values.type === 'FOREX' ? values.pair : 'BINARY';
    const notesRaw = values.pre_trade_notes ?? '';
    const notes = notesRaw.length > 0 ? notesRaw : '';
    if (values.type === 'FOREX') {
      const payload: import('./types').CreateForexTradePayload = {
        account_id: values.account_id,
        type: 'FOREX',
        instrument,
        pair: values.pair,
        direction: values.direction,
        entry_price: values.entry_price,
        lot_size: values.lot_size,
        stop_loss: values.stop_loss ?? null,
        take_profit: values.take_profit ?? null,
      };
      const enriched = {
        ...payload,
        ...(notes.length > 0 ? { pre_trade_notes: notes } : {}),
        ...(emotionalTags.length > 0 ? { emotional_tags: emotionalTags } : {}),
      };
      createTrade.mutate(enriched);
    } else {
      const payload: import('./types').CreateBinaryTradePayload = {
        account_id: values.account_id,
        type: 'BINARY',
        instrument,
        direction: values.direction,
        investment_usd: values.investment_usd,
        payout_pct: values.payout_pct,
        expiration_seconds: values.expiration_seconds,
      };
      const enriched = {
        ...payload,
        ...(notes.length > 0 ? { pre_trade_notes: notes } : {}),
        ...(emotionalTags.length > 0 ? { emotional_tags: emotionalTags } : {}),
      };
      createTrade.mutate(enriched);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleSubmitClick)}
      className="flex flex-col gap-4"
      data-testid="new-trade-form"
      noValidate
    >
      <Field label="Cuenta" error={errors.account_id?.message}>
        <Controller
          control={control}
          name="account_id"
          render={({ field }) => (
            <select
              {...field}
              data-testid="new-trade-account"
              className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.broker_name} · {a.type}
                </option>
              ))}
            </select>
          )}
        />
      </Field>

      {selectedType === 'FOREX' ? (
        <>
          <Field label="Par" error={(errors as Record<string, { message?: string } | undefined>)['pair']?.message}>
            <input
              {...control.register('pair')}
              data-testid="new-trade-pair"
              className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary uppercase"
              placeholder="EURUSD"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direccion" error={errors.direction?.message}>
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <select
                    {...field}
                    data-testid="new-trade-direction"
                    className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="LONG">Long</option>
                    <option value="SHORT">Short</option>
                  </select>
                )}
              />
            </Field>
            <Field label="Lotaje" error={(errors as Record<string, { message?: string } | undefined>)['lot_size']?.message}>
              <input
                {...control.register('lot_size')}
                type="text"
                inputMode="decimal"
                data-testid="new-trade-lot-size"
                className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0.10"
              />
            </Field>
          </div>
          <Field label="Precio de entrada" error={(errors as Record<string, { message?: string } | undefined>)['entry_price']?.message}>
            <input
              {...control.register('entry_price')}
              type="text"
              inputMode="decimal"
              data-testid="new-trade-entry-price"
              className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="1.0850"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stop loss (opcional)" error={(errors as Record<string, { message?: string } | undefined>)['stop_loss']?.message}>
              <input
                {...control.register('stop_loss')}
                type="text"
                inputMode="decimal"
                data-testid="new-trade-stop-loss"
                className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Take profit (opcional)" error={(errors as Record<string, { message?: string } | undefined>)['take_profit']?.message}>
              <input
                {...control.register('take_profit')}
                type="text"
                inputMode="decimal"
                data-testid="new-trade-take-profit"
                className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direccion" error={errors.direction?.message}>
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="CALL">Call</option>
                    <option value="PUT">Put</option>
                  </select>
                )}
              />
            </Field>
            <Field label="Inversion USD" error={(errors as Record<string, { message?: string } | undefined>)['investment_usd']?.message}>
              <input
                {...control.register('investment_usd')}
                type="text"
                inputMode="decimal"
                data-testid="new-trade-investment"
                className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="25"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payout %" error={(errors as Record<string, { message?: string } | undefined>)['payout_pct']?.message}>
              <input
                {...control.register('payout_pct')}
                type="text"
                inputMode="decimal"
                data-testid="new-trade-payout"
                className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="85"
              />
            </Field>
            <Field label="Expiracion (segundos)" error={(errors as Record<string, { message?: string } | undefined>)['expiration_seconds']?.message}>
              <input
                {...control.register('expiration_seconds', { valueAsNumber: true })}
                type="number"
                data-testid="new-trade-expiration"
                className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="60"
              />
            </Field>
          </div>
        </>
      )}

      <Field label="Notas pre-trade (opcional)" error={(errors as Record<string, { message?: string } | undefined>)['pre_trade_notes']?.message}>
        <textarea
          {...control.register('pre_trade_notes')}
          ref={notesRef}
          rows={3}
          data-testid="new-trade-pre-notes"
          className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
      </Field>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-text-secondary font-display">
          Etiquetas emocionales (opcional)
        </label>
        <EmotionalTagsChips value={emotionalTags} onChange={setEmotionalTags} />
      </div>

      <DisciplineSoftBlock
        preTradeNotes={watch('pre_trade_notes') ?? ''}
        emotionalTagsCount={emotionalTags.length}
        onConfirmSkip={() => {
          setShowSoftBlock(false);
          void handleSubmit(handleSubmitClick)();
        }}
        onRequestFocusNotes={() => notesRef.current?.focus()}
      />

      {createTrade.isError ? (
        <div
          role="alert"
          data-testid="new-trade-error"
          className="px-3 py-2 bg-loss/15 border border-loss/40 rounded-lg text-loss font-body text-sm"
        >
          {(createTrade.error as { message?: string } | null)?.message ?? 'Error al crear el trade'}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-3 py-2 text-text-secondary hover:text-text-primary font-body text-sm"
        >
          Limpiar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || createTrade.isPending}
          data-testid="new-trade-submit"
          className="px-4 py-2 bg-primary text-primary-fg font-display uppercase tracking-wide text-sm rounded-lg hover:shadow-glow-jade transition-shadow disabled:opacity-60"
        >
          {createTrade.isPending ? 'Creando...' : 'Crear trade'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  readonly label: string;
  readonly error?: string | undefined;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-display uppercase tracking-wide text-[10px] text-text-muted">
        {label}
      </span>
      {children}
      {error !== undefined && error !== '' ? (
        <span className="font-body text-xs text-loss">{error}</span>
      ) : null}
    </label>
  );
}
