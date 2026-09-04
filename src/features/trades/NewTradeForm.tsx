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
import { InterestChips } from './InterestChips';
import { getAvailableInstruments } from './availableInstruments';
import {
  DISCIPLINE_ERROR_MESSAGE,
  isHardBlockedByDiscipline,
  suggestedImporteUsd,
  type DisciplineErrorCode,
} from './discipline';
import { presignUpload, uploadFile } from './presign';
import type { EmotionalTag, Interest } from './types';

export interface NewTradeFormProps {
  readonly onSuccess?: () => void;
  readonly onError?: (code: string, message: string) => void;
}

/**
 * Broker-preset expiration values for BINARY accounts, in seconds.
 * Mirrors the most common Pocket/IQ-Option candle presets (1m/2m/3m/4m/5m/10m/15m).
 * Rendered as a `<select>` instead of a free-form number input so the user
 * cannot send out-of-range values that the backend would reject.
 */
const EXPIRATION_OPTIONS_SECONDS: ReadonlyArray<{
  readonly value: number;
  readonly label: string;
}> = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 240, label: '4 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
];

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

  // Derive the initial `type` AND `direction` from the first account.
  // The original bug: `direction` was hardcoded to `'LONG'` regardless
  // of the account type, so a BINARY first-account would open the form
  // with `type: 'BINARY'` + `direction: 'LONG'`. The select renders
  // CALL/PUT (BINARY branch) but the form state still has 'LONG', so
  // Zod rejects submission with `Expected 'CALL' | 'PUT', received 'LONG'`.
  const initialType: 'BINARY' | 'FOREX' =
    firstAccount?.type === 'BINARY' ? 'BINARY' : 'FOREX';
  const initialDirection: 'CALL' | 'LONG' =
    initialType === 'BINARY' ? 'CALL' : 'LONG';

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
      type: initialType,
      direction: initialDirection,
      pair: 'EURUSD',
      entry_price: '1',
      lot_size: '0.1',
      stop_loss: '',
      take_profit: '',
      investment_usd: '25',
      payout_pct: '85',
      expiration_seconds: 60,
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

  // one-by-one-thousand-discipline PR-2: interest (required, single-
  // select), discipline error pill, and the optional analysis-image
  // URL bound through the presigned upload flow. The state lives
  // outside RHF for the same reason emotionalTags does: chip / file
  // values would be mangled by RHF's string-typed register.
  const [interest, setInterest] = useState<Interest | null>(null);
  const [disciplineError, setDisciplineError] =
    useState<DisciplineErrorCode | null>(null);
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = watch('type');
  const watchedAccountId = watch('account_id');

  // Discriminated-union sync.
  //
  // Two responsibilities:
  //   1. Auto-select the first account when the user hasn't picked yet
  //      (covers the async-load case where accounts arrive after the
  //      form mounts — `firstAccount` is `undefined` on the first
  //      render, so `defaultValues.account_id` stays empty).
  //   2. Always reset `direction` to the type-correct default whenever
  //      the account changes. We intentionally do NOT gate on
  //      `account.type !== selectedType` (the old gate) because the
  //      original bug lived there: when the cached firstAccount was
  //      BINARY, `type` was already 'BINARY' from `defaultValues`, so
  //      the effect skipped the reset and direction kept its stale
  //      'LONG' value — Zod then rejected submission.
  useEffect(() => {
    if (accounts.length === 0) return;
    const account =
      accounts.find((a) => a.id === watchedAccountId) ?? accounts[0];
    if (!account) return;
    if (watchedAccountId !== account.id) {
      setValue('account_id', account.id);
    }
    if (selectedType !== account.type) {
      setValue('type', account.type);
    }
    const typeCorrectDirection = account.type === 'BINARY' ? 'CALL' : 'LONG';
    setValue('direction', typeCorrectDirection);
  }, [accounts, watchedAccountId, selectedType, setValue]);

  if (accounts.length === 0) {
    return (
      <div className="text-text-secondary font-body text-sm" data-testid="new-trade-no-accounts">
        Necesitas al menos una cuenta para crear un trade.
      </div>
    );
  }

  // Active account drives the suggested-importe preview (REQ-DISC-002
  // / 003) and the predictive hard-block (REQ-DISC-005/006). The
  // balance mirrors the backend's provisional capital-inicial proxy
  // (Trade.balance_usd, NOT the AccountMovement snapshot — WIP hasn't
  // merged; see backend design ADR-001).
  const activeAccount =
    accounts.find((a) => a.id === watchedAccountId) ?? accounts[0] ?? null;
  const accountBalance = activeAccount?.balance_usd;
  const suggestedImport =
    activeAccount !== null
      ? suggestedImporteUsd(computeCapitalInicial(accountBalance))
      : null;

  const handleSubmitClick: SubmitHandler<TradeFormValues> = (values) => {
    // Discipline gate 1 — interest required (REQ-INT-001). Surface a
    // typed error pill instead of letting the backend 422 with
    // INTEREST_REQUIRED (the user gets faster feedback this way).
    if (interest === null) {
      setDisciplineError('INTEREST_REQUIRED');
      return;
    }
    setDisciplineError(null);

    // Discipline gate 2 — predictive hard-block (REQ-DISC-005/006).
    // Mirrors backend rules 3 + 4 in discipline_engine so the user
    // can't even click submit when the value is guaranteed to fail.
    const deduct = computeDeduct(values);
    const capitalInicial = computeCapitalInicial(accountBalance);
    if (deduct !== null && isHardBlockedByDiscipline(deduct, capitalInicial)) {
      setDisciplineError('CAPITAL_INICIAL_CAP_EXCEEDED');
      return;
    }

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
    // Both FOREX and BINARY now flow the user-selected pair into
    // `instrument` — this is what shows up in the Operaciones table
    // and the Top Pairs leaderboard, so it has to match what the
    // trader actually clicked.
    const instrument = values.pair;
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
        interest,
        ...(analysisImageUrl !== null ? { analysis_image_url: analysisImageUrl } : {}),
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
        interest,
        ...(analysisImageUrl !== null ? { analysis_image_url: analysisImageUrl } : {}),
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

      {/* Both FOREX and BINARY need the user to specify the instrument
          (the actual pair traded). Previously the BINARY branch
          hard-coded the value to the literal string "BINARY" which
          made every binary trade indistinguishable in the Operaciones
          table. Now both branches share the same "Par" picker, and
          the available options come from `availableInstruments.ts`
          so the picker + the "Activos permitidos" settings panel
          stay in sync — change one, change both. */}
      <Field
        label={selectedType === 'FOREX' ? 'Par (FOREX)' : 'Instrumento (BINARY)'}
        error={(errors as Record<string, { message?: string } | undefined>)['pair']?.message}
      >
        <Controller
          control={control}
          name="pair"
          render={({ field }) => (
            <select
              {...field}
              data-testid="new-trade-pair"
              className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary uppercase"
            >
              <option value="">— Selecciona par —</option>
              {getAvailableInstruments(selectedType).map((instrument) => (
                <option key={instrument.symbol} value={instrument.symbol}>
                  {instrument.symbol} · {instrument.name}
                </option>
              ))}
            </select>
          )}
        />
      </Field>

      {selectedType === 'FOREX' ? (
        <>
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
                    data-testid="new-trade-direction"
                    className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="CALL">Compra</option>
                    <option value="PUT">Venta</option>
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
            <Field label="Expiracion" error={(errors as Record<string, { message?: string } | undefined>)['expiration_seconds']?.message}>
              <Controller
                control={control}
                name="expiration_seconds"
                render={({ field }) => (
                  <select
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    data-testid="new-trade-expiration"
                    className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {EXPIRATION_OPTIONS_SECONDS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </Field>
          </div>
        </>
      )}

      {/* one-by-one-thousand-discipline PR-2 — interest selector
          (REQ-INT-002/003). Single-select, required on every new
          trade. Sits BETWEEN the trade-shape fields and the notes so
          the user is forced to declare intent before journaling. */}
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-text-secondary font-display">
          Interés <span className="text-loss">*</span>
        </label>
        <InterestChips value={interest} onChange={setInterest} />
      </div>

      {/* Suggested-importe pill (REQ-DISC-002/003). Mirrors backend
          `ceil_to_next_dollar(capital_inicial * 0.0025)` so the user
          sees the round-up preview BEFORE typing. Hidden below the
          $1000 discipline threshold because the engine defers to the
          legacy balance gate in that case. */}
      {suggestedImport !== null ? (
        <div
          data-testid="new-trade-suggested-import"
          className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary font-mono text-xs"
        >
          <span className="font-display uppercase tracking-widest text-[10px]">Importe sugerido</span>
          <span className="font-display">${suggestedImport}</span>
        </div>
      ) : null}

      {/* Optional analysis-image upload (REQ-TI-ADD-001). Presign →
          upload → bind public_url. The bound URL rides the payload
          via ``analysis_image_url`` and lands on Trade.analysis_image_url. */}
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-text-secondary font-display">
          Imagen de análisis (opcional)
        </label>
        <input
          ref={fileInputRef}
          data-testid="new-trade-analysis-file"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file !== undefined) {
              void handleAnalysisFile(
                file,
                setAnalysisImageUrl,
                setImageUploading,
                setImageError,
              );
            }
          }}
          className="text-xs font-mono text-text-secondary file:mr-2 file:px-2 file:py-1 file:rounded file:border file:border-primary/30 file:bg-primary/10 file:text-primary file:font-display file:uppercase file:tracking-wide file:text-[10px] file:cursor-pointer"
        />
        {imageUploading ? (
          <span data-testid="new-trade-analysis-uploading" className="text-[11px] text-text-muted">
            Subiendo...
          </span>
        ) : analysisImageUrl !== null ? (
          <span data-testid="new-trade-analysis-uploaded" className="text-[11px] text-profit">
            Imagen lista ✓
          </span>
        ) : imageError !== null ? (
          <span data-testid="new-trade-analysis-error" className="text-[11px] text-loss">
            {imageError}
          </span>
        ) : null}
      </div>

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

      {createTrade.isError || disciplineError !== null ? (
        <div
          role="alert"
          data-testid="new-trade-error"
          className="px-3 py-2 bg-loss/15 border border-loss/40 rounded-lg text-loss font-body text-sm"
        >
          {(() => {
            // Discipline error pill (PR-2). When the client-side
            // gates (interest / hard-block) or a backend rejection
            // match a known discipline code, show the localized
            // message; the code identifier stays visible for support.
            if (disciplineError !== null) {
              return `${disciplineError}: ${DISCIPLINE_ERROR_MESSAGE[disciplineError]}`;
            }
            const err = createTrade.error as {
              code?: string;
              message?: string;
            } | null;
            // Map backend discipline codes to localized messages too.
            if (typeof err?.code === 'string' && err.code in DISCIPLINE_ERROR_MESSAGE) {
              return `${err.code}: ${DISCIPLINE_ERROR_MESSAGE[err.code as DisciplineErrorCode]}`;
            }
            const isTimeout =
              err?.code === 'ECONNABORTED' ||
              (typeof err?.message === 'string' &&
                err.message.toLowerCase().includes('timeout'));
            if (isTimeout) {
              return 'La operación tardó demasiado. Reintentá.';
            }
            if (err?.code !== undefined && err?.message !== undefined) {
              return `${err.code}: ${err.message}`;
            }
            return err?.message ?? 'Error al crear el trade';
          })()}
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

/**
 * Mirror of the backend deductible amount formula (REQ-DISC-005).
 * BINARY uses ``investment_usd``; FOREX uses ``lot * entry * 100``.
 * Returns ``null`` when the payload is missing the required field
 * (defensive — the form's per-type validation should catch that).
 */
function computeDeduct(values: TradeFormValues): number | null {
  if (values.type === 'BINARY') {
    const n = Number(values.investment_usd);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const lots = Number(values.lot_size);
  const entry = Number(values.entry_price);
  if (!Number.isFinite(lots) || !Number.isFinite(entry) || lots <= 0 || entry <= 0) {
    return null;
  }
  return Math.round(lots * entry * 100 * 100) / 100;
}

/**
 * Capital-inicial proxy for the suggested-importe preview. Mirrors
 * backend `_capital_inicial_usd` (PR-1 ADR-001 fallback: use the
 * active account's current balance, NOT the AccountMovement ledger
 * snapshot — the WIP hasn't merged yet).
 */
function computeCapitalInicial(balanceRaw: string | undefined): number {
  if (balanceRaw === undefined) return 0;
  const n = Number(balanceRaw);
  return Number.isFinite(n) ? n : 0;
}

async function handleAnalysisFile(
  file: File,
  setUrl: (url: string) => void,
  setBusy: (b: boolean) => void,
  setErr: (msg: string | null) => void,
): Promise<void> {
  setBusy(true);
  setErr(null);
  try {
    const presign = await presignUpload({
      file_name: file.name,
      content_type: file.type || 'image/png',
      key_prefix: 'trades/analysis',
    });
    const url = await uploadFile(file, presign);
    setUrl(url);
  } catch (err) {
    setErr(err instanceof Error ? err.message : 'upload falló');
  } finally {
    setBusy(false);
  }
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
