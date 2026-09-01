/*
 * p0b.1b — auth + subscription types that mirror the backend pydantic schemas.
 *
 * Source of truth (backend) lives in:
 *   - backend/app/schemas/auth.py
 *   - backend/app/schemas/user.py
 *   - backend/app/schemas/workspace.py
 *   - backend/app/schemas/subscription.py
 *   - backend/app/schemas/envelope.py
 *
 * Keep in sync. Any backend change to a field name or type MUST be
 * reflected here in the same slice, otherwise login/me/upgrade will silently
 * type-mismatch and the UI will render `undefined`.
 *
 * Per mem #68, code identifiers + comments stay in English. The UI
 * strings that surface to users are Spanish.
 */

export type UserRoleLiteral = 'USER' | 'ADMIN' | 'BOTH';

export const UserRoles = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  BOTH: 'BOTH',
} as const satisfies Record<UserRoleLiteral, UserRoleLiteral>;

export type UserRole = UserRoleLiteral;

/**
 * Plan tier exposed by the backend workspace. We mirror the literal
 * because the union isn't yet exported as a TS enum in `models`.
 * Values come from `app.models.WorkspacePlanTier`.
 */
export type WorkspacePlanTier = 'NONE' | 'STARTER' | 'PRO' | 'ELITE';

export type WorkspaceMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface WorkspaceOut {
  readonly id: string;
  readonly name: string;
  readonly plan_tier: WorkspacePlanTier;
  readonly role_in_workspace: WorkspaceMemberRole;
  readonly created_at: string;
}

/*
 * p0b.1b — UserOut drops `name` (split into first/last) and gains
 * `phone`. Mirrors `app.schemas.user.UserOut` after migration 0002.
 */
export interface UserOut {
  readonly id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly phone: string;
  readonly role: UserRole;
  readonly email_verified_at: string | null;
  readonly created_at: string;
}

/*
 * p0b.1b — Subscription tier/status mirrors the backend enums in
 * `app.models.subscription`. Keep the strings uppercase to match the
 * backend literally so the JSON-LD layer and the upgrade endpoint
 * share the same id namespace.
 */
export type SubscriptionTier = 'STARTER' | 'PLUS' | 'ELITE';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELED' | 'EXPIRED';

export interface SubscriptionOut {
  readonly id: string;
  readonly user_id: string;
  readonly workspace_id: string;
  readonly tier: SubscriptionTier;
  readonly status: SubscriptionStatus;
  readonly current_period_start: string;
  readonly current_period_end: string;
  readonly mp_preference_id: string | null;
  readonly mp_subscription_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * `/api/v1/auth/me` response — the canonical "current user" payload
 * for the SPA. Distinct from UserOut because it bundles the workspace
 * memberships so the dashboard can render the workspace switcher in
 * a single round-trip, plus the user's active subscription.
 *
 * p0b.1b: `name` → `first_name` + `last_name` + `phone`, and the
 * optional `current_subscription: SubscriptionOut | null` field was
 * added by p0b.1a so the dashboard can render the trial/active state
 * without a second round-trip.
 */
export interface AuthMeOut {
  readonly user_id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly phone: string;
  readonly role: UserRole;
  readonly workspaces: readonly WorkspaceOut[];
  readonly current_subscription: SubscriptionOut | null;
}

export interface TokenOut {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly token_type: 'bearer';
  readonly expires_in: number;
}

export interface MessageOut {
  readonly message: string;
}

/*
 * p0b.1b — `/subscriptions/upgrade` accepts only PLUS or ELITE
 * (STARTER is the trial, not an upgrade). We mirror the backend
 * `Literal["PLUS","ELITE"]` as a TS union so the form catches the
 * disallowed value at compile time.
 */
export type UpgradeTier = Exclude<SubscriptionTier, 'STARTER'>;

export interface UpgradeIn {
  readonly tier: UpgradeTier;
}

export interface UpgradeOut {
  readonly checkout_url: string;
  readonly mp_preference_id: string;
}

export interface CancelOut {
  readonly canceled: true;
  readonly subscription_id: string;
  readonly canceled_at: string;
}

export const ErrorCodeValues = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_EMAIL_TAKEN: 'AUTH_EMAIL_TAKEN',
  AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  AUTH_USER_INACTIVE: 'AUTH_USER_INACTIVE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  IDEMPOTENCY_KEY_REQUIRED: 'IDEMPOTENCY_KEY_REQUIRED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED',
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_ALREADY_ACTIVE: 'SUBSCRIPTION_ALREADY_ACTIVE',
  FORBIDDEN_NOT_ADMIN: 'FORBIDDEN_NOT_ADMIN',
  ADMINAC_CANNOT_DEACTIVATE_SELF: 'ADMINAC_CANNOT_DEACTIVATE_SELF',
  ADMINAC_INVALID_PRICE: 'ADMINAC_INVALID_PRICE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type ErrorCode = (typeof ErrorCodeValues)[keyof typeof ErrorCodeValues];

/**
 * Backend error envelope. Mirror of `app.schemas.envelope.ErrorEnvelope`.
 *
 * `correlation_id` is a uuid4 in production (36 chars) but we allow
 * any 8-64 char string to match the backend validator and survive
 * test mocks with shorter identifiers.
 */
export interface ErrorEnvelope {
  readonly code: ErrorCode;
  readonly message: string;
  readonly correlation_id: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * User-friendly fallback for any error code the backend might add in
 * the future that we haven't localized yet. Per mem #68 the fallback
 * is Spanish, with the code identifier (English) shown for support.
 */
export const FALLBACK_ERROR_MESSAGE = 'No pudimos completar la operacion. Intenta de nuevo.';

/**
 * Roles that may access the admin portal. BOTH is allowed because
 * internal staff uses the admin area; the portal selector lets them
 * pick which surface to enter.
 */
export const ADMIN_ROLES: ReadonlyArray<UserRole> = [UserRoles.ADMIN, UserRoles.BOTH];
