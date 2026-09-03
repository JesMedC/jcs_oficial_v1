/*
 * design-system-v1 (Wave 1, T1.4) — RouteFallback contract.
 *
 * RouteFallback renders a loading spinner inside React Router's lazy
 * Suspense boundary. After the Cyber-Jade keyframe rename, the
 * spinner MUST use `animate-status-dot-pulse` (the new utility) and
 * MUST NOT reference the legacy `pulse-cyan` arbitrary value.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { RouteFallback } from '../RouteFallback';

describe('RouteFallback', () => {
  it('renders the loading spinner with the spec status role + label', () => {
    render(<RouteFallback label="Cargando" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', 'Cargando');
  });

  it('uses the renamed animate-status-dot-pulse utility on the spinner', () => {
    const { container } = render(<RouteFallback />);
    const spinner = container.querySelector('.animate-status-dot-pulse');
    expect(spinner).not.toBeNull();
  });

  it('does NOT reference the legacy pulse-cyan animation class', () => {
    const { container } = render(<RouteFallback />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/pulse-cyan/);
  });
});
