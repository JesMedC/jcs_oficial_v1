/*
 * one-by-one-thousand-discipline (PR-2) — WinrateBySessionCard tests.
 *
 * Locks the 4-band + general tile composition (REQ-WRS-006):
 *   1. Renders the 5 tiles (ASIA / LONDON / NEW_YORK / SYDNEY /
 *      general) with integer % labels.
 *   2. Empty bands render the "—" placeholder.
 *   3. Loading state shows skeletons, error state shows the
 *      fallback message.
 *   4. The scope chip only renders when more than one account is
 *      provided.
 *
 * Slice B (sessions-configurable-cap) renamed the legacy
 * EUROPA / NY_AMERICA / NY_PM literals to the four real session
 * names. The fixtures mirror the new payload + new tile testids.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../../../features/dashboard/hooks';
import { WinrateBySessionCard } from '../WinrateBySessionCard';
import { SESSION_ORDER } from '../../../features/sessions/index';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const SAMPLE_RESPONSE = {
  workspace_id: 'w1',
  date_from: '2026-08-01',
  date_to: '2026-09-01',
  account_id: null,
  sessions: {
    ASIA: { trades: 4, wins: 3, winrate_pct: 75 },
    LONDON: { trades: 6, wins: 4, winrate_pct: 67 },
    NEW_YORK: { trades: 5, wins: 2, winrate_pct: 40 },
    SYDNEY: { trades: 3, wins: 1, winrate_pct: 33 },
  },
  general: { trades: 18, wins: 10, winrate_pct: 56 },
};

describe('WinrateBySessionCard', () => {
  it('renderiza las 4 bandas + general con labels enteros', async () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(
      <WinrateBySessionCard
        workspaceId="w1"
        dateFrom="2026-08-01"
        dateTo="2026-09-01"
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('75%');
      expect(screen.getByTestId('session-tile-LONDON')).toHaveTextContent('67%');
      expect(screen.getByTestId('session-tile-NEW_YORK')).toHaveTextContent('40%');
      expect(screen.getByTestId('session-tile-SYDNEY')).toHaveTextContent('33%');
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('56%');
    });
  });

  it('muestra "—" cuando una banda no tiene operaciones', async () => {
    const empty = {
      ...SAMPLE_RESPONSE,
      sessions: {
        ASIA: { trades: 0, wins: 0, winrate_pct: 0 },
        LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
        NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 0, wins: 0, winrate_pct: 0 },
    };
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: empty,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('—');
      expect(screen.getByTestId('session-tile-LONDON')).toHaveTextContent('—');
      expect(screen.getByTestId('session-tile-NEW_YORK')).toHaveTextContent('—');
      expect(screen.getByTestId('session-tile-SYDNEY')).toHaveTextContent('—');
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('—');
    });
  });

  it('muestra skeletons durante la carga', () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    expect(screen.getByTestId('winrate-loading')).toBeInTheDocument();
    // Skeletons still expose the tile testids so the layout doesn't
    // shift when data arrives.
    expect(screen.getByTestId('session-tile-ASIA')).toBeInTheDocument();
    expect(screen.getByTestId('session-tile-general')).toBeInTheDocument();
  });

  it('muestra fallback legible cuando el fetch falla', () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    expect(screen.getByTestId('winrate-error')).toHaveTextContent(
      /No pudimos cargar el winrate/i,
    );
  });

  it('oculta el chip de alcance cuando hay una sola cuenta', () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(
      <WinrateBySessionCard
        workspaceId="w1"
        availableAccounts={[{ id: 'a1', name: 'Pocket' }]}
      />,
      { wrapper: makeWrapper() },
    );

    expect(screen.queryByTestId('winrate-account-scope')).toBeNull();
  });

  it('muestra el chip de alcance cuando hay 2+ cuentas', () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(
      <WinrateBySessionCard
        workspaceId="w1"
        availableAccounts={[
          { id: 'a1', name: 'Pocket' },
          { id: 'a2', name: 'Forex' },
        ]}
      />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByTestId('winrate-account-scope')).toBeInTheDocument();
  });

  /*
   * dashboard-jarvis-fidelity (Slice B, T-039, REQ-DHF-001) —
   * Session tiles MUST render a `<HudRing>` primitive at the right
   * with `value={winrate_pct}` and `unit="%"`. We assert by reading
   * the rendered SVG's stroke-dashoffset (HudRing paints the ring
   * via an SVG `<circle>` whose dashoffset encodes the fill fraction).
   */
  it('T-039: cada tile de sesion monta un HudRing con el winrate y unit %', async () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    const { container } = render(<WinrateBySessionCard workspaceId="w1" />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('75%');
    });

    // Each session tile should now contain an SVG circle that paints
    // the ring (HudRing's primary stroke). We assert on the ASIA
    // tile as the smoke check; the other tiles share the same render
    // path so the contract holds for all of them.
    const asiaTile = screen.getByTestId('session-tile-ASIA');
    const ringSvg = asiaTile.querySelector('svg');
    expect(ringSvg).not.toBeNull();
    // HudRing renders at least the value circle + tick-mark lines,
    // so 2+ `<circle>` elements inside the SVG is a safe signal that
    // the primitive is mounted.
    const circles = ringSvg!.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2);
    // The value circle carries the dasharray + dashoffset that the
    // primitive computes from `value / max`. Confirm the dashoffset
    // exists so we know the ring has been parameterised.
    const valueCircle = Array.from(circles).find((c) =>
      c.getAttribute('stroke-dashoffset'),
    );
    expect(valueCircle).toBeDefined();

    // Each session tile MUST still expose its outer testid (no
    // data-testid removal in this slice).
    SESSION_ORDER.forEach((band) => {
      expect(screen.getByTestId(`session-tile-${band}`)).toBeInTheDocument();
    });
    // The GENERAL tile keeps its own testid (not part of SESSION_ORDER).
    expect(screen.getByTestId('session-tile-general')).toBeInTheDocument();

    // Sanity: the inline class still includes the glass card chrome
    // so the visual contract (backdrop blur + border) is preserved.
    expect(asiaTile.className).toContain('backdrop-blur-md');
    expect(container).toBeTruthy();
  });

  it('T-039 (triangulate): sesion vacia monta HudRing en 0 con label mutado "—"', async () => {
    const empty = {
      ...SAMPLE_RESPONSE,
      sessions: {
        ASIA: { trades: 0, wins: 0, winrate_pct: 0 },
        LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
        NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 0, wins: 0, winrate_pct: 0 },
    };
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: empty,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('—');
    });

    // HudRing is still mounted even when the tile is empty; the
    // ring simply renders at 0 (full track, no value stroke).
    const asiaTile = screen.getByTestId('session-tile-ASIA');
    const ringSvg = asiaTile.querySelector('svg');
    expect(ringSvg).not.toBeNull();
    // The value circle's dashoffset on a 0% ring equals the full
    // circumference (i.e. nothing painted) — we just confirm the
    // attribute is present so the primitive is provably mounted.
    const valueCircle = Array.from(ringSvg!.querySelectorAll('circle')).find(
      (c) => c.getAttribute('stroke-dashoffset'),
    );
    expect(valueCircle).toBeDefined();
  });

  it('T-039 (triangulate): winrate 100% cierra el ring (dashoffset = 0)', async () => {
    const perfect = {
      ...SAMPLE_RESPONSE,
      sessions: {
        ASIA: { trades: 4, wins: 4, winrate_pct: 100 },
        LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
        NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 0, wins: 0, winrate_pct: 0 },
    };
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: perfect,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-ASIA')).toHaveTextContent('100%');
    });

    const asiaTile = screen.getByTestId('session-tile-ASIA');
    const valueCircle = Array.from(asiaTile.querySelectorAll('circle')).find(
      (c) => c.getAttribute('stroke-dashoffset'),
    );
    // 100% fill → dashoffset must equal 0 (full ring painted).
    expect(valueCircle?.getAttribute('stroke-dashoffset')).toBe('0');
  });

  /*
   * dashboard-jarvis-fidelity (Slice B, T-040, REQ-DHF-002) —
   * GENERAL tile MUST span 2 columns inside the parent grid AND
   * render TWO concentric `<HudRing>` (outer halo at 0.4 opacity
   * + inner ring at 1.0). The outer testid `session-tile-general`
   * stays attached to the wrapper.
   */
  it('T-040: GENERAL tile spans 2 columnas (md:col-span-2) y monta doble anillo', async () => {
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: SAMPLE_RESPONSE,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('56%');
    });

    const general = screen.getByTestId('session-tile-general');
    // 1) Layout: col-span-2 only applies at md+; we assert the class
    //    is present (Tailwind picks it up via responsive variant).
    expect(general.className).toContain('md:col-span-2');

    // 2) Double ring: TWO `<svg>` elements inside the GENERAL tile.
    //    HudRing renders 1 SVG per instance (outer + inner halo +
    //    tick marks). Each instance contributes a single <svg>.
    const svgs = general.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);

    // 3) Each ring carries a value circle with a dashoffset that
    //    encodes its fill fraction. We assert at least 2 such
    //    circles (one per ring instance).
    const valueCircles = Array.from(general.querySelectorAll('circle')).filter(
      (c) => c.getAttribute('stroke-dashoffset') !== null,
    );
    expect(valueCircles.length).toBeGreaterThanOrEqual(2);

    // 4) The wrapper still exposes the glass chrome so the GENERAL
    //    tile reads as a card (not a plain element).
    expect(general.className).toContain('backdrop-blur-md');
  });

  it('T-040 (triangulate): GENERAL tile vacio mantiene doble anillo y label "—"', async () => {
    const empty = {
      ...SAMPLE_RESPONSE,
      sessions: {
        ASIA: { trades: 0, wins: 0, winrate_pct: 0 },
        LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
        NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 0, wins: 0, winrate_pct: 0 },
    };
    vi.spyOn(api, 'useSessionStats').mockReturnValue({
      data: empty,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.useSessionStats>);

    render(<WinrateBySessionCard workspaceId="w1" />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tile-general')).toHaveTextContent('—');
    });

    const general = screen.getByTestId('session-tile-general');
    expect(general.className).toContain('md:col-span-2');
    // Even empty, the double-ring chrome stays mounted.
    expect(general.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });
});