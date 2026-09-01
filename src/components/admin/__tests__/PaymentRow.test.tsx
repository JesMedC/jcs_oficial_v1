/*
 * p0c — PaymentRow tests.
 *
 * Verifica que los badges de status se renderizan con el label
 * correcto y que los campos numéricos se formatean en USD.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentRow } from '../PaymentRow';
import type { PaymentOut } from '../../features/payments/types';

function buildPayment(overrides: Partial<PaymentOut> = {}): PaymentOut {
  return {
    id: 'p1',
    mp_payment_id: 'mp-12345678',
    user_id: 'u1',
    subscription_id: null,
    status: 'APPROVED',
    amount_usd: '9.99',
    payer_email: 'payer@example.com',
    mp_created_at: '2026-09-01T10:00:00Z',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

function renderRow(p: PaymentOut) {
  return render(
    <table>
      <tbody>
        <PaymentRow payment={p} />
      </tbody>
    </table>,
  );
}

describe('PaymentRow', () => {
  it('renders mp_payment_id, payer email, USD amount, and APPROVED badge', () => {
    renderRow(buildPayment());
    expect(screen.getByText('mp-12345678')).toBeInTheDocument();
    expect(screen.getByText('payer@example.com')).toBeInTheDocument();
    expect(screen.getByText('$9.99')).toBeInTheDocument();
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
  });

  it('renders REJECTED badge when status is REJECTED', () => {
    renderRow(buildPayment({ status: 'REJECTED' }));
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  it('renders CANCELLED badge when status is CANCELLED', () => {
    renderRow(buildPayment({ status: 'CANCELLED' }));
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });
});