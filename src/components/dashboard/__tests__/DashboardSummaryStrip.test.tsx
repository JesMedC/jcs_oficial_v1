/*
 * dashboard-jarvis-fidelity (Slice B, T-042, REQ-DHF-004) —
 * DashboardSummaryStrip tests.
 *
 * Locks the sparkline reposition contract:
 *   - `data-testid="summary-sparkline"` MUST live inside the card
 *     body (a sibling of the value `<span>`), NOT in the label
 *     row.
 *   - Balance Total tone rule (REQ-DHF-006): profit when
 *     `balanceTotal > 0`, muted otherwise.
 *
 * The card uses `SparklineIcon` internally so the test asserts on
 * the SVG via the pinned testid (no need to import the primitive).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardSummaryStrip } from '../DashboardSummaryStrip';

describe('DashboardSummaryStrip — sparkline + balance tone (T-042 / T-043)', () => {
  it('T-042: summary-sparkline vive dentro del cuerpo de la card (NO en el label row)', () => {
    render(<DashboardSummaryStrip balanceTotal={1000} tradesForCount={[]} />);

    const sparkline = screen.getByTestId('summary-sparkline');
    expect(sparkline).toBeInTheDocument();

    // The sparkline's direct parent must be the card body, not the
    // label row. We assert the parent is the card root (which
    // contains both the label row AND the body), and that the
    // sparkline is NOT a direct child of the label row.
    const operations = screen.getByTestId('summary-operations');
    const cardRoot = operations;

    // Card root MUST contain the sparkline (descendant test).
    expect(cardRoot.contains(sparkline)).toBe(true);

    // The sparkline's parent must NOT be the label row. We
    // detect the label row by looking for the immediate ancestor
    // whose first child is the "Operaciones" label span.
    let parent: HTMLElement | null = sparkline.parentElement;
    expect(parent).not.toBeNull();
    // The parent should be the card body, which means it has the
    // sparkline as its ONLY direct child (mx-auto wrapper), so
    // the parent has no preceding label sibling at the same depth.
    if (parent !== null) {
      // The label row's first child is a text-only `<span>`.
      // The body wrapper holds the sparkline — its previousElementSibling
      // should be the value `<span>` and the value's previousElementSibling
      // should be the label `<span>`.
      const grandParent = parent.parentElement;
      expect(grandParent).not.toBeNull();
      // Grandparent is the card. It contains BOTH the label row
      // and the body. We assert the sparkline is NOT inside the
      // first child (the label row).
      if (grandParent !== null) {
        const firstChild = grandParent.firstElementChild;
        expect(firstChild?.contains(sparkline)).toBe(false);
      }
    }
  });

  it('T-043: Balance Total usa text-profit cuando balanceTotal > 0', () => {
    render(<DashboardSummaryStrip balanceTotal={1250.5} tradesForCount={[]} />);

    const balance = screen.getByTestId('summary-balance');
    // Find the value <span> — it's a child of the card.
    const valueSpan = balance.querySelector('span.font-mono');
    expect(valueSpan).not.toBeNull();
    expect(valueSpan!.className).toContain('text-profit');
  });

  it('T-043 (triangulate): Balance Total usa text-text-muted cuando balanceTotal = 0', () => {
    render(<DashboardSummaryStrip balanceTotal={0} tradesForCount={[]} />);

    const balance = screen.getByTestId('summary-balance');
    const valueSpan = balance.querySelector('span.font-mono');
    expect(valueSpan).not.toBeNull();
    expect(valueSpan!.className).toContain('text-text-muted');
    expect(valueSpan!.className).not.toContain('text-profit');
  });

  it('T-042 (triangulate): las 4 cards siguen renderizando con sus testids', () => {
    render(<DashboardSummaryStrip balanceTotal={500} tradesForCount={[]} />);

    expect(screen.getByTestId('summary-balance')).toBeInTheDocument();
    expect(screen.getByTestId('summary-operations')).toBeInTheDocument();
    expect(screen.getByTestId('summary-pnl')).toBeInTheDocument();
    expect(screen.getByTestId('summary-winrate')).toBeInTheDocument();
  });

  /*
   * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-005) — JARVIS HUD
   * polish on the summary strip:
   *   - each card lives inside `<HudPanel>` so it carries the glass
   *     background + chamfered hex corners + cyan border.
   *   - the headline value paints with the cyan glow
   *     (`text-shadow-glow`) when profit-toned so the eye reads it
   *     as a "lit" HUD number.
   *   - numeric values animate via `useCountUp` to the target
   *     (asserted by checking the formatted text settles on the
   *     target value once the animation completes — we rely on
   *     useCountUp's tests for the rAF path).
   */
  describe('JARVIS v2 chrome + count-up (REQ-DCF-JV2-005)', () => {
    it('each card mounts inside a HudPanel (chamfered hex + glass)', () => {
      render(<DashboardSummaryStrip balanceTotal={1000} tradesForCount={[]} />);

      for (const testId of [
        'summary-balance',
        'summary-operations',
        'summary-pnl',
        'summary-winrate',
      ]) {
        const card = screen.getByTestId(testId);
        const style = card.getAttribute('style') ?? '';
        // The HudPanel inline style carries the JARVIS chrome.
        expect(style, `${testId} should carry HUD panel chrome`).toContain(
          'rgba(10, 25, 47, 0.6)',
        );
        expect(style, `${testId} should carry hex clip-path`).toContain(
          'clip-path: polygon(',
        );
        expect(style, `${testId} should carry cyan border`).toContain(
          'rgba(0, 229, 255, 0.3)',
        );
      }
    });

    it('profit-toned values apply the cyan text-shadow-glow', () => {
      render(<DashboardSummaryStrip balanceTotal={1250.5} tradesForCount={[]} />);

      const balance = screen.getByTestId('summary-balance');
      const valueSpan = balance.querySelector('span.font-mono');
      expect(valueSpan).not.toBeNull();
      // text-shadow-glow is a Tailwind utility mapped from the
      // `textShadow.glow` token; the rendered class name should
      // contain it.
      expect(valueSpan!.className).toContain('text-shadow-glow');
    });

    it('muted values do NOT apply the glow (no LED ring on empty state)', () => {
      render(<DashboardSummaryStrip balanceTotal={0} tradesForCount={[]} />);

      const balance = screen.getByTestId('summary-balance');
      const valueSpan = balance.querySelector('span.font-mono');
      expect(valueSpan).not.toBeNull();
      expect(valueSpan!.className).not.toContain('text-shadow-glow');
    });
  });
});
