/*
 * p0c — client-side page-view tracking.
 *
 * Llamado por ``usePageviewTracker`` en cada cambio de ruta. Best-effort:
 * cualquier error (red, 401, 5xx) se silencia — analytics nunca debe
 * romper la UX.
 *
 * ``anonymous_id`` se persiste en una cookie NO-httpOnly
 * (``jcs.analytics.anon_id``) para correlacionar visitas del mismo
 * visitante. La cookie la setea el backend en el primer POST.
 *
 * Si el usuario está autenticado, el client incluye el Bearer token
 * para que el backend atribuya la visita a su ``user_id`` en lugar de
 * al ``anonymous_id``.
 */
import { tokenStore } from '../api/client';

export interface RecordPageviewParams {
  readonly page_path: string;
  readonly page_title?: string | undefined;
  readonly referrer?: string | undefined;
}

const ANON_COOKIE_NAME = 'jcs.analytics.anon_id';
const DEFAULT_BASE_URL = 'http://localhost:8000/api/v1';

function getBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL;
  return (env as string | undefined) ?? DEFAULT_BASE_URL;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const k = trimmed.slice(0, eqIdx);
    const v = trimmed.slice(eqIdx + 1);
    if (k === name && v !== '') return decodeURIComponent(v);
  }
  return null;
}

function generateUuid(): string {
  // RFC 4122 v4 UUID. Implementado inline para no agregar una dep.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback Math.random (suficiente para un anon_id no-seguro).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ensureAnonId(): string {
  const existing = readCookie(ANON_COOKIE_NAME);
  if (existing !== null) return existing;
  const id = generateUuid();
  // Cookie NO-httpOnly: el JS debe poder leerla. 1 año de duración.
  if (typeof document !== 'undefined') {
    const oneYear = 365 * 24 * 60 * 60;
    document.cookie = `${ANON_COOKIE_NAME}=${encodeURIComponent(id)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
  }
  return id;
}

function getSessionId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const key = 'jcs.analytics.session_id';
  let sid = sessionStorage.getItem(key);
  if (sid === null || sid === '') {
    sid = generateUuid();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function getReferrer(): string | null {
  if (typeof document === 'undefined') return null;
  return document.referrer !== '' ? document.referrer : null;
}

export async function recordPageview(params: RecordPageviewParams): Promise<void> {
  // Best-effort — silencio total en caso de error.
  try {
    const token = tokenStore.getAccess();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token !== null) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Pre-asegura el anon_id para que la cookie se setee en el primer hit
    // antes de mandar la request. Si el usuario está autenticado, el
    // backend ignora el anon_id y lo deja en null.
    ensureAnonId();

    const body: Record<string, unknown> = {
      page_path: params.page_path,
    };
    if (params.page_title !== undefined && params.page_title !== '') {
      body['page_title'] = params.page_title;
    }
    const ref = params.referrer ?? getReferrer();
    if (ref !== null) {
      body['referrer'] = ref;
    }
    const sid = getSessionId();
    if (sid !== null) {
      body['session_id'] = sid;
    }

    await fetch(`${getBaseUrl()}/analytics/pageview`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
      keepalive: true,
    });
  } catch {
    /* analytics es best-effort — silenciamos todo. */
  }
}
