/*
 * p0b.1b — AuthProvider context.
 *
 * Responsibilities:
 *   1. Hold the canonical `user: AuthMeOut | null` state.
 *   2. Derivce `subscription: SubscriptionOut | null` from
 *      `user.current_subscription`. Components subscribe to the
 *      derived value so the dashboard and the upgrade page see the
 *      same subscription atomically without duplicate state.
 *   3. On mount, call `meApi()` using the stored access token. If
 *      the call returns 401, the axios interceptor attempts ONE
 *      refresh; on success, `meApi()` is retried. If the refresh
 *      also fails, the user is treated as logged out and any
 *      intended URL is preserved for after re-auth.
 *   4. Expose `login`, `register`, `logout`, `refresh`, `setPortal`
 *      actions that the forms and route guards call.
 *   5. Persist tokens in sessionStorage (per mem #70 / R2: no
 *      secrets in localStorage; sessionStorage clears when the tab
 *      closes which is acceptable for v0). The `jcs.portal` slot
 *      tracks which portal a BOTH-role user last entered.
 *   6. FIX-4 — after a successful /me, if `user.timezone === "UTC"`
 *      AND the browser reports a different IANA TZ, silently PATCH
 *      the user's TZ so the calendar / session bucketing matches the
 *      local clock. Guarded by a sessionStorage flag so we don't
 *      re-fetch on every reload.
 *
 * The provider is mounted inside the router tree (router/index.tsx)
 * so `useNavigate` works from the post-login redirect.
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import {
  loginApi,
  logoutApi,
  meApi,
  patchMeApi,
  refreshApi,
  registerApi,
} from './api';
import { tokenStore } from '../../lib/api/client';
import type { AuthMeOut, ErrorEnvelope, SubscriptionOut, TokenOut } from './types';
import { clearStoredPortal, readStoredPortal, writeStoredPortal, type Portal } from './authStorage';

// FIX-4 — auto-heal flag. We only attempt the silent TZ PATCH once
// per browser session to avoid an infinite loop on tab refocus.
const TZ_HEALED_FLAG = 'jcs.tz_auto_healed';

export type { Portal } from './authStorage';

export interface AuthContextValue {
  readonly user: AuthMeOut | null;
  readonly subscription: SubscriptionOut | null;
  readonly loading: boolean;
  readonly error: ErrorEnvelope | null;
  readonly portal: Portal | null;
  readonly login: (email: string, password: string) => Promise<AuthMeOut>;
  readonly register: (
    first_name: string,
    last_name: string,
    phone: string,
    email: string,
    password: string,
  ) => Promise<AuthMeOut>;
  readonly logout: () => Promise<void>;
  readonly refresh: () => Promise<AuthMeOut | null>;
  readonly setPortal: (portal: Portal) => void;
  readonly clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthMeOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const [portal, setPortalState] = useState<Portal | null>(() => readStoredPortal());
  const navigate = useNavigate();
  const bootstrapped = useRef<boolean>(false);

  const persistTokens = useCallback((tokens: TokenOut) => {
    tokenStore.set(tokens.access_token, tokens.refresh_token);
  }, []);

  const loadCurrentUser = useCallback(async (): Promise<AuthMeOut | null> => {
    try {
      const me = await meApi();
      // FIX-4 — auto-heal the legacy ``UTC`` timezone backfill.
      // Migration 0011 set every existing user's ``timezone`` to
      // ``"UTC"`` because pre-discipline the column didn't exist.
      // That makes the calendar / 4-band session resolver bucket
      // trades on UTC dates — wrong for any user outside UTC (Chile,
      // Argentina, etc.). If the browser reports a different IANA TZ
      // we silently PATCH /auth/me once per browser session and
      // replace ``me`` in state with the refreshed payload.
      if (
        typeof window !== 'undefined' &&
        me.timezone === 'UTC' &&
        sessionStorage.getItem(TZ_HEALED_FLAG) !== '1'
      ) {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTz && browserTz !== 'UTC') {
          sessionStorage.setItem(TZ_HEALED_FLAG, '1');
          try {
            const refreshed = await patchMeApi({ timezone: browserTz });
            setUser(refreshed);
            return refreshed;
          } catch {
            // If the PATCH fails we still keep the original ``me`` —
            // the user's bucketing will keep working in UTC until
            // they manually change it. Don't crash login over a TZ
            // heuristic.
            setUser(me);
            return me;
          }
        } else {
          // Browser reports UTC (or is empty) — no heal needed but
          // still set the flag so we don't keep re-evaluating.
          sessionStorage.setItem(TZ_HEALED_FLAG, '1');
        }
      } else if (
        typeof window !== 'undefined' &&
        sessionStorage.getItem(TZ_HEALED_FLAG) === null
      ) {
        // Even when the user is already on a non-UTC TZ, set the
        // flag so subsequent visits don't re-evaluate.
        sessionStorage.setItem(TZ_HEALED_FLAG, '1');
      }
      setUser(me);
      return me;
    } catch (err) {
      const envelope = err as ErrorEnvelope;
      // The axios interceptor already tried a refresh + cleared
      // tokens on failure. Treat any 401-shaped error as "not
      // signed in" silently.
      if (envelope && typeof envelope === 'object' && 'code' in envelope) {
        setUser(null);
        return null;
      }
      setUser(null);
      return null;
    }
  }, []);

  // Bootstrap on mount: if a refresh token is present, try to mint
  // a fresh access token then load /me. If nothing is stored, the
  // user is anonymous.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const refresh = tokenStore.getRefresh();
    if (refresh === null) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const tokens = await refreshApi(refresh);
        persistTokens(tokens);
        await loadCurrentUser();
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCurrentUser, persistTokens]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const tokens = await loginApi({ email, password });
      persistTokens(tokens);
      const me = await loadCurrentUser();
      if (me === null) {
        throw {
          code: 'AUTH_TOKEN_INVALID',
          message: 'No pudimos cargar tu cuenta. Intenta de nuevo.',
          correlation_id: 'unavailable',
        } satisfies ErrorEnvelope;
      }
      return me;
    },
    [loadCurrentUser, persistTokens],
  );

  const register = useCallback(
    async (
      first_name: string,
      last_name: string,
      phone: string,
      email: string,
      password: string,
    ) => {
      setError(null);
      const tokens = await registerApi({ first_name, last_name, phone, email, password });
      persistTokens(tokens);
      const me = await loadCurrentUser();
      if (me === null) {
        throw {
          code: 'AUTH_TOKEN_INVALID',
          message: 'No pudimos cargar tu cuenta. Intenta de nuevo.',
          correlation_id: 'unavailable',
        } satisfies ErrorEnvelope;
      }
      return me;
    },
    [loadCurrentUser, persistTokens],
  );

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    try {
      if (refresh !== null) {
        await logoutApi(refresh);
      }
    } catch {
      // Logout is best-effort — the backend may already have
      // revoked the token. We clear locally either way.
    }
    tokenStore.clear();
    clearStoredPortal();
    setUser(null);
    setError(null);
    setPortalState(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const refresh = useCallback(async () => loadCurrentUser(), [loadCurrentUser]);

  const setPortal = useCallback((next: Portal) => {
    writeStoredPortal(next);
    setPortalState(next);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const subscription = useMemo<SubscriptionOut | null>(
    () => (user === null ? null : user.current_subscription),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      subscription,
      loading,
      error,
      portal,
      login,
      register,
      logout,
      refresh,
      setPortal,
      clearError,
    }),
    [
      user,
      subscription,
      loading,
      error,
      portal,
      login,
      register,
      logout,
      refresh,
      setPortal,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
