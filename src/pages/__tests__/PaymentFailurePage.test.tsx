/*
 * p0c — PaymentFailurePage test.
 *
 * Verifica que el H1 "Pago no completado" se renderiza + los 2 CTAs.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import { PaymentFailurePage } from '../PaymentFailurePage';

describe('PaymentFailurePage', () => {
  it('renders the failure H1 + 2 CTAs + ref', () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/payment/failure?payment_id=67890']}>
          <PaymentFailurePage />
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pago no completado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Reintentar pago/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al portal/i })).toBeInTheDocument();
    expect(screen.getByText(/Ref: 67890/)).toBeInTheDocument();
  });
});