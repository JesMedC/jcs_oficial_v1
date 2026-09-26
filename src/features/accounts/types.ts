/*
 * p0d.3 — accounts feature types.
 *
 * Mirror of `backend/app/schemas/trading_account.py`. Keep the field
 * names in sync with the backend Pydantic models — any rename there
 * MUST be reflected here, otherwise the list/create flow will silently
 * type-mismatch and the UI will render `undefined`.
 *
 * Per mem #68, code identifiers + comments stay in English. UI
 * strings that surface to users are Spanish (badge labels live here
 * because they are tightly coupled to the type literal).
 */

/**
 * TradingAccountType enum values. Mirrors `backend/app/models/trading_account.py`.
 */
export type AccountTypeLiteral = 'BINARY' | 'FOREX';

/**
 * AccountMovementType enum values. Mirrors `backend/app/models/account_movement.py`.
 */
export type AccountMovementTypeLiteral =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRADE_MARGIN'
  | 'TRADE_RETURN'
  | 'TRADE_PROFIT';

/**
 * Single trading account row. ``balance_usd`` is a string in JSON
 * because the backend serializes ``Decimal`` as a JSON string to
 * preserve precision — we parse with ``Number()`` only at render time.
 */
export interface AccountOut {
  readonly id: string;
  readonly user_id: string;
  readonly workspace_id: string;
  readonly broker_name: string;
  readonly type: AccountTypeLiteral;
  readonly name: string;
  readonly balance_usd: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Immutable balance movement row returned by ``GET /accounts/{id}/movements``.
 * Decimal values are serialized as strings by the backend.
 */
export interface AccountMovementOut {
  readonly id: string;
  readonly account_id: string;
  readonly movement_type: AccountMovementTypeLiteral;
  readonly amount: string;
  readonly previous_balance: string;
  readonly post_balance: string;
  readonly occurred_at: string;
}

/**
 * Paginated envelope returned by ``GET /accounts/{id}/movements``.
 */
export interface AccountMovementList {
  readonly items: readonly AccountMovementOut[];
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
}

/**
 * Paginated envelope returned by ``GET /accounts``.
 */
export interface AccountList {
  readonly items: readonly AccountOut[];
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
}

/**
 * Body for ``POST /accounts``. Mirrors ``TradingAccountIn``: no
 * ``balance_usd`` — server initializes it to 0.
 */
export interface CreateAccountPayload {
  readonly broker_name: string;
  readonly type: AccountTypeLiteral;
  readonly name: string;
}

/**
 * Query params for ``GET /accounts``. Both are optional; the backend
 * applies sensible defaults when omitted.
 */
export interface ListAccountsParams {
  readonly skip?: number;
  readonly limit?: number;
}

/**
 * Query params for ``GET /accounts/{id}/movements``. The backend caps
 * ``limit`` at 100 and defaults to the newest first page.
 */
export interface ListAccountMovementsParams {
  readonly skip?: number;
  readonly limit?: number;
}

/**
 * Badge map for the accounts table (Spanish labels + Tailwind
 * classes). Matches the PAYMENT_STATUS_BADGE pattern in payments so
 * the visual language stays consistent across admin + portal.
 */
export const ACCOUNT_TYPE_BADGE: Record<
  AccountTypeLiteral,
  { readonly label: string; readonly className: string }
> = {
  BINARY: {
    label: 'Binary',
    className: 'bg-primary/15 text-primary border-primary/40',
  },
  FOREX: {
    label: 'Forex',
    className: 'bg-profit/15 text-profit border-profit/40',
  },
};

export const ACCOUNT_MOVEMENT_TYPE_LABEL: Record<AccountMovementTypeLiteral, string> = {
  DEPOSIT: 'Fondeo',
  WITHDRAWAL: 'Retiro',
  TRADE_MARGIN: 'Margen de operación',
  TRADE_RETURN: 'Retorno de margen',
  TRADE_PROFIT: 'Resultado de operación',
};
