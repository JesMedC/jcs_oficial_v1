/*
 * p0a.2 — auth types that mirror the backend pydantic schemas.
 *
 * Source of truth (backend) lives in:
 *   - backend/app/schemas/auth.py
 *   - backend/app/schemas/user.py
 *   - backend/app/schemas/workspace.py
 *   - backend/app/schemas/envelope.py
 *
 * Keep in sync. Any backend change to a field name or type MUST be
 * reflected here in the same slice, otherwise login/me will silently
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

export interface UserOut {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly email_verified_at: string | null;
  readonly created_at: string;
}

/**
 * `/api/v1/auth/me` response — the canonical "current user" payload
 * for the SPA. Distinct from UserOut because it bundles the workspace
 * memberships so the dashboard can render the workspace switcher in
 * a single round-trip.
 */
export interface AuthMeOut {
  readonly user_id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly workspaces: readonly WorkspaceOut[];
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
