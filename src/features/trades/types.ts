/*
 * p0e.5 — trades feature types.
 *
 * Mirror of `backend/app/schemas/trade.py` (p0e.4). Keep the field
 * names in sync with the backend Pydantic models — any rename there
 * MUST be reflected here, otherwise the list/create/close flow will
 * silently type-mismatch and the UI will render `undefined`.
 *
 * Numeric fields stay as strings because the backend serializes
 * ``Decimal`` as JSON strings to preserve precision; the UI parses
 * with ``Number()`` only at render time.
 *
 * Per mem #68, code identifiers + comments stay in English. UI
 * strings that surface to users are Spanish (badge labels live here
 * because they are tightly coupled to the type literal).
 */

export type TradeType = 'FOREX' | 'BINARY' | 'FUND' | 'WITHDRAW';

export type TradeStatus = 'OPEN' | 'CLOSED_WIN' | 'CLOSED_LOSS' | 'CLOSED_BREAK';

export type ForexDirection = 'LONG' | 'SHORT';

export type BinaryDirection = 'CALL' | 'PUT';

export type EmotionalTag = 'FOMO' | 'REVENGE' | 'PATIENCE' | 'DISCIPLINE' | 'OTHER';

/**
 * FOREX-specific payload fields. ``stop_loss`` and ``take_profit``
 * are nullable — not every setup plans an exit before entry.
 */
export interface ForexFields {
  readonly pair: string;
  readonly lot_size: string;
  readonly direction: ForexDirection;
  readonly entry_price: string;
  readonly stop_loss: string | null;
  readonly take_profit: string | null;
}

/**
 * BINARY-specific payload fields. ``expiration_seconds`` is the only
 * non-string numeric — broker expirations are small integers, no
 * decimal precision concerns.
 */
export interface BinaryFields {
  readonly investment_usd: string;
  readonly payout_pct: string;
  readonly expiration_seconds: number;
  readonly direction: BinaryDirection;
}

/**
 * FOREX close payload — the only FOREX-specific field needed at close.
 */
export interface ForexCloseFields {
  readonly exit_price: string;
}

/**
 * BINARY close payload — outcome is a binary WIN/LOSS flag.
 */
export interface BinaryCloseFields {
  readonly outcome: 'WIN' | 'LOSS';
}

/**
 * Full trade row returned by the backend. Top-level fields are always
 * present (nullable where the value is genuinely optional); the FOREX
 * and BINARY sub-fields are optional and only present when ``type``
 * matches (the backend fills them server-side).
 *
 * ``direction`` is typed as the union of both enums — the consumer
 * narrows on ``type`` at the call site.
 */
export interface TradeOut {
  readonly id: string;
  readonly user_id: string;
  readonly account_id: string;
  readonly instrument: string;
  readonly type: TradeType;
  readonly status: TradeStatus;
  readonly opened_at: string;
  readonly closed_at: string | null;
  readonly strategy_id: string | null;
  readonly emotional_tags: readonly EmotionalTag[] | null;
  readonly pre_trade_notes: string | null;
  readonly post_trade_notes: string | null;
  readonly followed_plan: boolean | null;
  readonly mistakes: string | null;
  readonly screenshots: readonly string[] | null;
  // FOREX-only (present when type === 'FOREX').
  readonly pair?: string;
  readonly lot_size?: string;
  readonly direction?: ForexDirection | BinaryDirection;
  readonly entry_price?: string;
  readonly stop_loss?: string | null;
  readonly take_profit?: string | null;
  readonly exit_price?: string | null;
  readonly risk_amount_usd?: string | null;
  readonly risk_pct?: string | null;
  readonly r_multiple?: string | null;
  // BINARY-only (present when type === 'BINARY').
  readonly investment_usd?: string;
  readonly payout_pct?: string;
  readonly expiration_seconds?: number;
  // Shared PnL (null while OPEN, populated when the trade closes).
  readonly pnl_usd?: string | null;
}

/**
 * Paginated envelope returned by ``GET /trades``.
 */
export interface TradeList {
  readonly items: readonly TradeOut[];
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
}

/**
 * Body for ``POST /trades`` when opening a FOREX position. Mirrors
 * ``ForexTradeIn`` on the backend. ``stop_loss`` and ``take_profit``
 * come from ``ForexFields`` as nullable (required to send — send
 * ``null`` when the setup does not plan an exit).
 */
export interface CreateForexTradePayload extends ForexFields {
  readonly account_id: string;
  readonly instrument: string;
  readonly type: 'FOREX';
  readonly pre_trade_notes?: string;
  readonly emotional_tags?: readonly EmotionalTag[];
  readonly screenshots?: readonly string[];
  readonly strategy_id?: string;
}

/**
 * Body for ``POST /trades`` when opening a BINARY position. Mirrors
 * ``BinaryTradeIn`` on the backend.
 */
export interface CreateBinaryTradePayload extends BinaryFields {
  readonly account_id: string;
  readonly instrument: string;
  readonly type: 'BINARY';
  readonly pre_trade_notes?: string;
  readonly emotional_tags?: readonly EmotionalTag[];
  readonly screenshots?: readonly string[];
  readonly strategy_id?: string;
}

/**
 * Discriminated union for ``POST /trades``. The backend narrows on
 * ``type`` to pick the right validation branch.
 */
export type CreateTradePayload = CreateForexTradePayload | CreateBinaryTradePayload;

/**
 * Body for ``POST /trades/{id}/close``.
 *
 * Mirrors the backend ``TradeCloseIn`` exactly (no ``type`` field).
 * The backend discriminates FOREX vs BINARY by the trade's own
 * ``type`` already loaded server-side — sending ``type`` here makes
 * the backend reject the request with 422 VALIDATION_ERROR
 * ``"Extra inputs are not permitted"`` (``model_config=extra="forbid"``
 * on ``TradeCloseIn``).
 *
 * The form types ``CloseForexFormValues`` / ``CloseBinaryFormValues``
 * (see ``schemas.ts``) keep ``type`` as the Zod discriminator for
 * branching the UI; ``CloseTradeModal.onSubmit`` strips it before
 * forwarding to ``closeTradeApi``.
 *
 * FOREX needs an ``exit_price``; BINARY needs an ``outcome``. The
 * journal triple (``post_trade_notes``, ``followed_plan``,
 * ``mistakes``) is optional on both branches.
 */
export type CloseTradePayload =
  | {
      readonly exit_price: string;
      readonly post_trade_notes?: string;
      readonly followed_plan?: boolean;
      readonly mistakes?: string;
    }
  | {
      readonly outcome: 'WIN' | 'LOSS';
      readonly post_trade_notes?: string;
      readonly followed_plan?: boolean;
      readonly mistakes?: string;
    };

/**
 * Query params for ``GET /trades``. All optional — the backend
 * applies sensible defaults (no filter, pagination 0/50) when
 * everything is omitted.
 */
export interface ListTradesParams {
  readonly account_id?: string;
  readonly status?: TradeStatus;
  readonly type?: TradeType;
  readonly skip?: number;
  readonly limit?: number;
}

/**
 * Status badge map for the trades table (Spanish labels + Tailwind
 * classes). Matches the PAYMENT_STATUS_BADGE pattern in payments so
 * the visual language stays consistent across admin + portal.
 */
export const TRADE_STATUS_BADGE: Record<
  TradeStatus,
  { readonly label: string; readonly className: string }
> = {
  OPEN: {
    label: 'Abierta',
    className: 'bg-warning/15 text-warning border-warning/40',
  },
  CLOSED_WIN: {
    label: 'Ganada',
    className: 'bg-profit/15 text-profit border-profit/40',
  },
  CLOSED_LOSS: {
    label: 'Perdida',
    className: 'bg-loss/15 text-loss border-loss/40',
  },
  CLOSED_BREAK: {
    label: 'Break-even',
    className: 'bg-text-muted/15 text-text-muted border-text-muted/40',
  },
};

/**
 * Type badge map (Spanish labels + Tailwind classes). FOREX uses the
 * brand primary cyan; BINARY uses the secondary blue ``info`` so the
 * two kinds read as siblings rather than one dominant + one muted.
 */
export const TRADE_TYPE_BADGE: Record<
  TradeType,
  { readonly label: string; readonly className: string }
> = {
  FOREX: {
    label: 'Forex',
    className: 'bg-primary/15 text-primary border-primary/40',
  },
  BINARY: {
    label: 'Binarias',
    className: 'bg-info/15 text-info border-info/40',
  },
  FUND: {
    label: 'Deposito',
    className: 'bg-profit/15 text-profit border-profit/40',
  },
  WITHDRAW: {
    label: 'Retiro',
    className: 'bg-warning/15 text-warning border-warning/40',
  },
};

/**
 * Spanish labels for the emotional tag enum. Used by the journal
 * chips on the trade detail page (badge-less — plain text + emoji
 * icons handled by the UI layer).
 */
export const EMOTIONAL_TAG_LABEL: Record<EmotionalTag, string> = {
  FOMO: 'FOMO',
  REVENGE: 'Venganza',
  PATIENCE: 'Paciencia',
  DISCIPLINE: 'Disciplina',
  OTHER: 'Otro',
};

/**
 * Risk level returned by ``GET /trades/risk-summary``. Drives the
 * topbar semaphore and the dashboard guard rail. Mirrors
 * ``RiskLevel`` on the backend.
 */
export type RiskLevel = 'green' | 'yellow' | 'red';

/**
 * Aggregated risk snapshot returned by ``GET /trades/risk-summary``.
 * ``daily_pnl_usd`` stays as a string (the backend serializes
 * ``Decimal`` as JSON strings to preserve precision — same convention
 * as the rest of the trade types). ``win_rate_today`` is a plain
 * number in ``[0, 1]`` — it's a derived ratio, not money.
 */
export interface RiskSummary {
  readonly level: RiskLevel;
  readonly daily_pnl_usd: string;
  readonly open_trades_count: number;
  readonly win_rate_today: number;
  readonly message: string;
}
