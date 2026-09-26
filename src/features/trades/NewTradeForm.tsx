/*
 * portal-fase0a-base — NewTradeForm.
 *
 * RHF + Zod resolver over the discriminated TradeFormSchema. Fields
 * change based on whether the user has a FOREX account or a BINARY
 * account selected — the form narrows on ``type``. On valid submit it
 * hands the parsed payload to useCreateTrade.mutate(...) which does
 * the POST + invalidation dance.
 *
 * New trade form — captures the disciplined pre-trade ritual
 * (notes, emotional tags, analysis image) and submits via the
 * ``useCreateTrade`` mutation. The journal fields are OPTIONAL; an
 * empty journal no longer blocks submission (the previous soft-block
 * banner was removed — discipline nudging is delegated to the
 * ``discipline_engine`` error codes at submit time).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAccounts } from '../accounts/hooks';
import { TradeFormSchema, type TradeFormValues } from './schemas';
import { useCreateTrade } from './useCreateTrade';
import { EmotionalTagsChips } from './EmotionalTagsChips';
import { getAvailableInstruments } from './availableInstruments';
import { InstrumentPicker } from './InstrumentPicker';
import { RiskPreview } from './RiskPreview';
import {
  DISCIPLINE_ERROR_MESSAGE,
  evaluateBinarySession,
  isHardBlockedByDiscipline,
  montoCalculadoParaBalance,
  type DisciplineErrorCode,
} from './discipline';
import { useAuth } from '../auth/useAuth';
import {
  localBucketForTimestamp,
  sessionForTimestamp,
} from '../sessions';
import { ceilingFor } from '../sessions/plan';
import { useTrades } from './hooks';
import { presignUpload, uploadFile } from './presign';
import type { EmotionalTag } from './types';
import type { NewTradePrefill } from '../../stores/useNewTradeDrawer';

export interface NewTradeFormProps {
  readonly onSuccess?: () => void;
  readonly onError?: (code: string, message: string) => void;
  /**
   * Optional scanner prefill payload. When the user clicks
   * "Cargar en Diario" on a scanner alert, the pair + direction
   * land here so the form opens already filled. The drawer
   * re-mounts the form whenever `prefill` transitions to a new
   * non-null value (keyed in NewTradeDrawer), so the effect that
   * seeds the form runs cleanly.
   */
  readonly prefill?: NewTradePrefill | null;
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

export function NewTradeForm({ onSuccess, onError, prefill }: NewTradeFormProps) {
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
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TradeFormValues>({
    resolver: zodResolver(TradeFormSchema),
    defaultValues: {
      account_id: firstAccount?.id ?? '',
      type: initialType,
      direction: initialDirection,
      pair: prefill?.pair ?? 'EURUSD',
      entry_price: '1',
      lot_size: '0.1',
      stop_loss: '',
      take_profit: '',
      // PR-4: investment_usd is now a derived, read-only display
      // computed from the account balance via montoCalculadoParaBalance.
      // The placeholder satisfies the Zod min:1/max:404 schema but is
      // never used on the wire — handleSubmitClick overrides it with
      // the calculated amount before the payload is assembled.
      investment_usd: prefill?.investment_usd ?? '1',
      payout_pct: '78',
      expiration_seconds: 300,
      pre_trade_notes: '',
      emotional_tags: [],
    } as unknown as TradeFormValues,
  });

  // `emotionalTags` lives outside RHF on purpose: the chip selector
  // is a controlled component and RHF's value-as-string model would
  // mangle the array.
  const [emotionalTags, setEmotionalTags] = useState<EmotionalTag[]>([]);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // one-by-one-thousand-discipline PR-2: interest was removed from
  // the form (it's optional now, the backend defaults to "PLAN").
  // The discipline error pill + the optional analysis-image URL
  // (presigned upload flow) still live outside RHF for the same
  // reason emotionalTags does: chip / file values would be mangled
  // by RHF's string-typed register.
  const [disciplineError, setDisciplineError] =
    useState<DisciplineErrorCode | null>(null);
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = watch('type');
  const watchedAccountId = watch('account_id');
  const watchedLotSize = watch('lot_size');
  const watchedEntryPrice = watch('entry_price');
  const watchedStopLoss = watch('stop_loss');

  // Active account drives the calculated-investment display (REQ-DISC-002
  // / 003) and the predictive hard-block (REQ-DISC-005/006). The
  // balance mirrors the backend's provisional capital-inicial proxy
  // (Trade.balance_usd, NOT the AccountMovement snapshot — WIP hasn't
  // merged; see backend design ADR-001). The `useMemo` lives BEFORE
  // the early-return guard below so the hook order stays stable
  // across renders (React rule-of-hooks).
  const activeAccount =
    accounts.find((a) => a.id === watchedAccountId) ?? accounts[0] ?? null;
  const accountBalance = activeAccount?.balance_usd;
  const capitalInicial = computeCapitalInicial(accountBalance);
  const montoCalculado = useMemo(
    () =>
      activeAccount !== null
        ? montoCalculadoParaBalance(capitalInicial)
        : null,
    [activeAccount, capitalInicial],
  );

  // TWR-06 / USC — BINARY session pre-flight (client-side mirror of
  // the backend gate). Fetches the active account's recent BINARY
  // trades, filters them down to the same ``(local_day, band)``
  // bucket the backend uses (``localBucketForTimestamp`` honours
  // the user's IANA timezone — the previous mirror filtered by
  // UTC band only and wrongly locked the form when a CLOSED_LOSS
  // from a prior day happened to share the UTC band with now),
  // then runs ``evaluateBinarySession`` with the workspace's
  // effective cap. The cap is ``workspace.session_ops_cap`` when
  // set (admin tightening) or the universal ceiling (4 post-USC,
  // same value for every plan tier). Backend is still
  // authoritative; this is a UX shortcut so the user sees the
  // localized reason before clicking.
  const { user } = useAuth();
  const activeWorkspace = user?.workspaces[0];
  const tz = user?.timezone ?? 'UTC';
  const sessionCap = useMemo(() => {
    const override = activeWorkspace?.session_ops_cap;
    if (override !== null && override !== undefined) {
      // Backend clamps any override above the universal ceiling
      // via ``_workspace_session_cap`` — clamp here too so the
      // verdict matches the wire verdict.
      return Math.min(override, ceilingFor(activeWorkspace?.plan_tier ?? 'NONE'));
    }
    return ceilingFor(activeWorkspace?.plan_tier ?? 'NONE');
  }, [activeWorkspace?.session_ops_cap, activeWorkspace?.plan_tier]);
  const nowIso = useMemo(() => new Date().toISOString(), []);
  const currentBand = useMemo(
    () => (selectedType === 'BINARY' ? sessionForTimestamp(nowIso) : null),
    [selectedType, nowIso],
  );
  const bucketTradesQuery = useTrades(
    selectedType === 'BINARY' && activeAccount !== null
      ? { account_id: activeAccount.id, type: 'BINARY', limit: 500 }
      : { type: 'BINARY', limit: 500 },
  );
  const binarySessionVerdict = useMemo(() => {
    if (selectedType !== 'BINARY' || currentBand === null) return null;
    const items = bucketTradesQuery.data?.items ?? [];
    // ``localBucketForTimestamp`` returns the same ``(day, band)``
    // tuple the backend ``_bucket_binary_trades_for_day`` builds
    // with ``user.timezone`` — keeping the two aligned is what
    // prevents the historical false-positive (a LOSS in the same
    // UTC band but a different local day wrongly locked the form).
    const nowBucket = localBucketForTimestamp(nowIso, tz);
    if (nowBucket === null) return null;
    const sameBucket = items.filter((t) => {
      if (t.type !== 'BINARY') return false;
      const tb = localBucketForTimestamp(t.opened_at, tz);
      return tb !== null && tb.day === nowBucket.day && tb.band === nowBucket.band;
    });
    return evaluateBinarySession(sameBucket, sessionCap);
  }, [selectedType, currentBand, bucketTradesQuery.data, nowIso, tz, sessionCap]);

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
  //
  // TWR-06 / USC: when a scanner prefill is active (PUT for BINARY),
  // we skip the ``direction`` reset so the scanner's chosen direction
  // survives the async account load. The prefill effect below re-
  // asserts the direction on every prefill / type change so the
  // sync doesn't need to fight it.
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
    // Skip direction reset when a scanner prefill is active and the
    // active account matches the prefill's market (BINARY). The
    // prefill effect re-asserts the chosen direction below.
    const prefillIsActive =
      prefill !== null &&
      prefill !== undefined &&
      prefill.pair.length > 0 &&
      account.type === 'BINARY';
    if (prefillIsActive) return;
    const typeCorrectDirection = account.type === 'BINARY' ? 'CALL' : 'LONG';
    setValue('direction', typeCorrectDirection);
  }, [accounts, watchedAccountId, selectedType, prefill, setValue]);

  // Scanner prefill — when the drawer opens with a non-null
  // ``prefill`` payload we seed `pair` + (where compatible)
  // `direction` onto the existing form state. The discriminated-
  // union sync effect above already keeps `type` glued to the
  // active account; we only override `direction` if the active
  // account is BINARY (FOREX accounts would reject a CALL/PUT
  // direction, so the typed union protects us there).
  useEffect(() => {
    if (prefill === undefined || prefill === null) return;
    if (prefill.pair.length > 0) {
      setValue('pair', prefill.pair);
    }
    if (selectedType === 'BINARY') {
      // BINARY supports PUT/CALL — apply the prefill directly.
      setValue('direction', prefill.direction);
    }
    if (prefill.investment_usd !== undefined && prefill.investment_usd.length > 0) {
      setValue('investment_usd', prefill.investment_usd);
    }
  }, [prefill, selectedType, watchedAccountId, setValue]);

  if (accounts.length === 0) {
    return (
      <div className="text-text-secondary font-body text-sm" data-testid="new-trade-no-accounts">
        Necesitas al menos una cuenta para crear un trade.
      </div>
    );
  }
  const handleSubmitClick: SubmitHandler<TradeFormValues> = (values) => {
    setDisciplineError(null);
    if (!getAvailableInstruments(values.type).some((instrument) => instrument.symbol === values.pair)) {
      setError('pair', { type: 'validate', message: 'Selecciona un instrumento disponible para esta cuenta.' });
      return;
    }

    // PR-4: investment_usd is a derived, read-only field computed
    // from the account balance. The RHF default is a placeholder
    // ('1') that satisfies Zod's min:1/max:404 but never reaches the
    // wire — we swap in the calculated amount here so the payload,
    // the predictive hard-block, and the rendered field all agree.
    //
    // `montoCalculado === null` means the account exists but its
    // balance is below the $1 floor. The submit button is disabled
    // in that branch (see below) but we still guard here in case
    // the user invokes submit via keyboard before React disables it.
    const isBinary = values.type === 'BINARY';
    const investmentForPayload =
      isBinary && montoCalculado !== null ? montoCalculado.toString() : '';
    const adjustedValues: TradeFormValues = isBinary
      ? { ...values, investment_usd: investmentForPayload }
      : values;

    // Discipline gate — predictive hard-block (REQ-DISC-005/006).
    // Mirrors backend rules 3 + 4 in discipline_engine so the user
    // can't even click submit when the value is guaranteed to fail.
    const deduct = computeDeduct(adjustedValues);
    const capitalInicial = computeCapitalInicial(accountBalance);
    if (deduct !== null && isHardBlockedByDiscipline(deduct, capitalInicial, selectedType)) {
      setDisciplineError('CAPITAL_INICIAL_CAP_EXCEEDED');
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
        investment_usd: investmentForPayload,
        payout_pct: values.payout_pct,
        expiration_seconds: values.expiration_seconds,
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
            <InstrumentPicker
              key={selectedType}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              instruments={getAvailableInstruments(selectedType)}
              label={selectedType === 'FOREX' ? 'Par (FOREX)' : 'Instrumento (BINARY)'}
              invalid={Boolean(errors.pair)}
            />
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
              {/*
                PR-4: read-only derived display. The investment is
                computed from the account balance via
                `montoCalculadoParaBalance` (three-tier rule, capped at
                $404, floored at $1). The user cannot edit this value —
                it IS the discipline envelope. We render `<output>` for
                semantic meaning ("result of a calculation") and keep
                `data-testid="new-trade-investment"` so existing tests
                can still target the field by id. When the balance is
                too low to compute (< $1) we show "—" and the submit
                button is disabled.
               */}
              <output
                data-testid="new-trade-investment"
                className="w-full px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-body text-sm focus:outline-none focus:ring-1 focus:ring-primary block"
              >
                {montoCalculado !== null ? `$${montoCalculado}` : '—'}
              </output>
            </Field>
          </div>
          {/* TWR-06 / USC / USC-2 — Session gate verdict (BINARY only).
              DVC-02: moved OUT of the ``grid grid-cols-2 gap-3``
              wrapper above so the pill spans the full form width
              (it used to render at half-width next to INVERSIÓN USD).
              Re-skinned with the incumbent dark/cyan platform
              tokens: solid ``bg-bg`` (var(--color-bg)) surface,
              ``border-jade`` (var(--color-jade)) cyan stroke,
              ``font-body`` body typography, ``text-text-primary``
              readable text size. Heading carries the semantic error
              cue (``text-loss``); body keeps the canonical W/L/P&L
              summary so the pill text agrees byte-for-byte with the
              backend ``_validate_binary_session`` rejection. The
              ``break-words`` + ``min-w-0`` combo keeps long wins /
              pnl numbers from pushing the layout past the viewport.
              ``role=alert`` is preserved for AT; the new
              ``aria-live=polite`` announces the verdict when it
              transitions from ok to locked. Backend is still
              authoritative — this is a UX shortcut. */}
          {selectedType === 'BINARY' && binarySessionVerdict?.ok === false ? (
            <div
              data-testid="new-trade-binary-session-locked"
              role="alert"
              aria-live="polite"
              className="mt-2 flex items-start gap-3 rounded-lg border border-jade bg-bg px-4 py-3 font-body text-text-primary"
            >
              <span aria-hidden="true" className="text-base leading-5">
                ⛔
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="text-sm font-semibold leading-5 text-loss">
                  Limite de operaciones alcanzado
                </div>
                <div className="break-words text-sm leading-5 text-text-secondary">
                  {binarySessionVerdict.reason === 'LOSS_IN_SESSION'
                    ? `Ganaste ${binarySessionVerdict.stats.wins} operaciones y Perdiste ${binarySessionVerdict.stats.losses} operaciones P&L: ${binarySessionVerdict.stats.pnlUsd.toFixed(2)} USD`
                    : `La próxima operación se habilita cuando las ${binarySessionVerdict.cap} anteriores cierren como WIN.`}
                </div>
              </div>
            </div>
          ) : null}
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

      {/* PR-4: the "Máx permitido" pill is gone. The investment
          field itself is now the canonical read-only display of the
          calculated amount (three-tier rule), so duplicating it in
          a pill would be redundant. The previous pill block lived
          here. */}

      <RiskPreview
        selectedType={selectedType}
        accountBalance={accountBalance}
        binaryInvestment={montoCalculado}
        forexLotSize={watchedLotSize}
        forexEntryPrice={watchedEntryPrice}
        forexStopLoss={watchedStopLoss}
      />

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
          // PR-4: disable submit when the calculated amount is null
          // (balance < $1) — there is no valid investment to send.
          // The submit handler also guards this case but disabling
          // upfront is friendlier than letting the user click and
          // staring at a stalled form.
          disabled={
            isSubmitting ||
            createTrade.isPending ||
            (selectedType === 'BINARY' && montoCalculado === null) ||
            (selectedType === 'BINARY' && binarySessionVerdict?.ok === false)
          }
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
 * Capital-inicial proxy for the calculated-investment preview.
 * Mirrors backend `_capital_inicial_usd` (PR-1 ADR-001 fallback: use
 * the active account's current balance, NOT the AccountMovement
 * ledger snapshot — the WIP hasn't merged yet).
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
