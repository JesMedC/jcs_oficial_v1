/*
 * p0c — PaymentRow.
 *
 * Una fila de la tabla de pagos del admin. Muestra el MP ID truncado,
 * el email del payer, monto USD formateado, badge de estado con
 * color semántico y la fecha del pago en MP.
 */
import type { PaymentOut, PaymentStatusLiteral } from '../../features/payments/types';
import { PAYMENT_STATUS_BADGE } from '../../features/payments/types';

interface PaymentRowProps {
  readonly payment: PaymentOut;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatUsd(amount: string): string {
  return `$${Number(amount).toFixed(2)}`;
}

export function PaymentRow({ payment }: PaymentRowProps) {
  const badge = PAYMENT_STATUS_BADGE[payment.status as PaymentStatusLiteral];

  return (
    <tr className="border-t border-primary/10 hover:bg-surface/40 transition-colors">
      <td className="px-4 py-3 font-mono text-text-primary text-xs">
        {payment.mp_payment_id.slice(0, 12)}
        {payment.mp_payment_id.length > 12 ? '...' : ''}
      </td>
      <td className="px-4 py-3 text-text-primary font-body text-sm truncate max-w-[200px]">
        {payment.payer_email}
      </td>
      <td className="px-4 py-3 text-primary font-display text-sm">
        {formatUsd(payment.amount_usd)}
      </td>
      <td className="px-4 py-3">
        <span
          className={[
            'inline-flex items-center px-2 py-0.5 rounded-full font-display uppercase tracking-wide text-[10px] border',
            badge.className,
          ].join(' ')}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-3 text-text-secondary font-body text-xs">
        {formatDate(payment.mp_created_at)}
      </td>
    </tr>
  );
}
