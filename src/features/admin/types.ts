/*
 * p0b.2 — admin types.
 *
 * Mirror of the backend `app.schemas.admin` Pydantic models. Keep the
 * field names in sync with the backend (enforced by the OpenAPI schema
 * served from /docs in dev). Spanish-only user-facing strings; the
 * `tier` / `status` literals stay uppercase to match the backend enum
 * values verbatim.
 */
import type { SubscriptionOut, SubscriptionStatus, SubscriptionTier } from '../auth/types';

// Re-export the admin-only codes so callers can use them without
// importing the auth types directly. We keep them as plain string
// literals because the canonical `ErrorCode` union in auth/types.ts
// is locked down — new codes land there in a follow-up slice (p0c) so
// the SPA's envelope narrows in lockstep with the backend.
export type AdminErrorCodeLiteral =
  | 'FORBIDDEN_NOT_ADMIN'
  | 'ADMINAC_CANNOT_DEACTIVATE_SELF'
  | 'ADMINAC_INVALID_PRICE';

export interface UserWithSubscription {
  readonly id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly phone: string;
  readonly role: 'USER' | 'ADMIN' | 'BOTH';
  readonly is_active: boolean;
  readonly email_verified_at: string | null;
  readonly created_at: string;
  readonly current_subscription: SubscriptionOut | null;
}

export interface AdminUserList {
  readonly items: readonly UserWithSubscription[];
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
}

export interface PlanTierPrice {
  readonly id: string;
  readonly tier: SubscriptionTier;
  readonly price_usd: string; // Decimal from JSON — keep as string for precision.
  readonly billing_period_days: number;
  readonly is_active: boolean;
  readonly effective_from: string;
  readonly effective_until: string | null;
  readonly created_at: string;
}

export interface SetUserActive {
  readonly is_active: boolean;
}

export interface UpdatePlanPrice {
  readonly price_usd: string;
}

/*
 * Error codes introduced in p0b.2. Mirrors `ErrorCode` enum in
 * `app.schemas.envelope` — extends the canonical set from auth/types.ts.
 */
export const AdminErrorCodes: Record<AdminErrorCodeLiteral, AdminErrorCodeLiteral> = {
  FORBIDDEN_NOT_ADMIN: 'FORBIDDEN_NOT_ADMIN',
  ADMINAC_CANNOT_DEACTIVATE_SELF: 'ADMINAC_CANNOT_DEACTIVATE_SELF',
  ADMINAC_INVALID_PRICE: 'ADMINAC_INVALID_PRICE',
};

export type AdminErrorCode = AdminErrorCodeLiteral;

/**
 * Tier label map (Spanish user-facing). Keep in sync with the pricing
 * page tiers so the admin plans UI matches the public pricing card.
 */
export const TIER_LABELS: Record<SubscriptionTier, string> = {
  STARTER: 'Starter',
  PLUS: 'Plus',
  ELITE: 'Elite',
};

/**
 * Status badge map for the users table (Spanish labels + Tailwind
 * classes). Reused from the SubscriptionCard pattern in p0b.1b.
 */
export const STATUS_BADGE: Record<
  SubscriptionStatus,
  { readonly label: string; readonly className: string }
> = {
  TRIAL: {
    label: 'Periodo de prueba',
    className: 'bg-primary/15 text-primary border-primary/40',
  },
  ACTIVE: {
    label: 'Activo',
    className: 'bg-profit/15 text-profit border-profit/40',
  },
  CANCELED: {
    label: 'Cancelado',
    className: 'bg-warning/15 text-warning border-warning/40',
  },
  EXPIRED: {
    label: 'Expirado',
    className: 'bg-loss/15 text-loss border-loss/40',
  },
};
