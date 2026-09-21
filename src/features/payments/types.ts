/*
 * p0c — payments feature types.
 *
 * Mirror of `backend/app/schemas/payment.py`. Keep the field names in
 * sync with the backend Pydantic models. The status strings stay
 * uppercase to match the backend enum literally.
 */

export type PaymentStatusLiteral = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED';

export interface PaymentOut {
  readonly id: string;
  readonly mp_payment_id: string;
  readonly user_id: string;
  readonly subscription_id: string | null;
  readonly status: PaymentStatusLiteral;
  readonly amount_usd: string; // Decimal from JSON — keep as string for precision.
  readonly payer_email: string;
  readonly mp_created_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PaymentList {
  readonly items: readonly PaymentOut[];
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
}

/**
 * Status badge map for the admin payments table (Spanish labels +
 * Tailwind classes). Reused from the STATUS_BADGE pattern in admin.
 */
export const PAYMENT_STATUS_BADGE: Record<
  PaymentStatusLiteral,
  { readonly label: string; readonly className: string }
> = {
  PENDING: {
    label: 'Pendiente',
    className: 'bg-warning/15 text-warning border-warning/40',
  },
  APPROVED: {
    label: 'Aprobado',
    className: 'bg-profit/15 text-profit border-profit/40',
  },
  REJECTED: {
    label: 'Rechazado',
    className: 'bg-loss/15 text-loss border-loss/40',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-warning/15 text-warning border-warning/40',
  },
  REFUNDED: {
    label: 'Reembolsado',
    className: 'bg-text-muted/15 text-text-muted border-text-muted/40',
  },
};
