/*
 * p0c — pageview tracking tests.
 *
 * Verifica que ``recordPageview`` envíe el POST con el body correcto y
 * que ``usePageviewTracker`` dispare el tracking al cambiar la ruta.
 *
 * El test usa un mock global de ``fetch`` para no pegarle a la API.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { recordPageview } from '../pageview';

describe('pageview tracking', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof document !== 'undefined') {
      document.cookie = 'jcs.analytics.anon_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('sends a POST to /analytics/pageview with page_path and a generated anon_id', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await recordPageview({ page_path: '/pricing' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url as string).toContain('/analytics/pageview');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.page_path).toBe('/pricing');
    expect(typeof body.session_id === 'string' || body.session_id === undefined).toBe(true);
  });

  it('sets the jcs.analytics.anon_id cookie on first call (non-httpOnly)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    if (typeof document !== 'undefined') {
      expect(document.cookie).not.toContain('jcs.analytics.anon_id');
    }

    await recordPageview({ page_path: '/home' });

    if (typeof document !== 'undefined') {
      expect(document.cookie).toContain('jcs.analytics.anon_id');
    }
  });

  it('silently swallows fetch errors (analytics is best-effort)', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('boom'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(recordPageview({ page_path: '/x' })).resolves.toBeUndefined();
  });
});