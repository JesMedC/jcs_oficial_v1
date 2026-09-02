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
 * Single trading account row. ``balance_usd`` is a string in JSON
 * because the backend serializes ``Decimal`` as a JSON string to
 * preserve precision — we parse with ``Number()`` only at render time.
 */
export interface AccountOut {
  readonly id: string;
  readonly user_id: string;
  readonly broker_name: string;
  readonly type: AccountTypeLiteral;
  readonly name: string;
  readonly balance_usd: string;
  readonly created_at: string;
  readonly updated_at: string;
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