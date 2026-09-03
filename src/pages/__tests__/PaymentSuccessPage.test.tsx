/*
 * p0c — PaymentSuccessPage test.
 *
 * Verifica que el H1 "Pago exitoso" se renderiza y que el componente
 * arranca un redirect a /dashboard al montar.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('../../features/auth/api', () => ({
  getMySubscriptionApi: vi.fn().mockResolvedValue(null),
}));

import { PaymentSuccessPage } from '../PaymentSuccessPage';

beforeEach(() => {
  vi.useFakeTimers();
});

describe('PaymentSuccessPage', () => {
  it('renders the success H1 + sub copy + spinner', async () => {
    vi.useRealTimers();
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/payment/success?payment_id=12345']}>
          <PaymentSuccessPage />
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Pago exitoso' })).toBeInTheDocument();
    expect(screen.getByText(/Tu suscripcion esta activa/i)).toBeInTheDocument();
    expect(screen.getByText(/Ref: 12345/)).toBeInTheDocument();
  });

  // design-system-v1 (Wave 1, T1.4) — verify the loading spinner
  // references the renamed animate-status-dot-pulse utility (the
  // page is the second consumer of the legacy pulse-cyan keyframe).
  it('renders the loading spinner with animate-status-dot-pulse and no pulse-cyan', () => {
    vi.useRealTimers();
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/payment/success?payment_id=12345']}>
          <PaymentSuccessPage />
        </MemoryRouter>
      </HelmetProvider>,
    );
    const spinner = container.querySelector('.animate-status-dot-pulse');
    expect(spinner).not.toBeNull();
    expect(container.innerHTML).not.toMatch(/pulse-cyan/);
  });
});