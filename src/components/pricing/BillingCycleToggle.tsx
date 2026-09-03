import type { BillingCycle } from '../../lib/seo/jsonLd';

/*
 * p1c — Billing cycle toggle (Mensual / Anual -20%).
 *
 * Stateless presentational component. The `cycle` and `onChange` are
 * owned by PricingPage so the cycle also drives the JSON-LD payload.
 */
interface BillingCycleToggleProps {
  readonly cycle: BillingCycle;
  readonly onChange: (next: BillingCycle) => void;
}

export function BillingCycleToggle({ cycle, onChange }: BillingCycleToggleProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Ciclo de facturacion"
        className="inline-flex items-center bg-surface-el/40 border border-primary/30 rounded-full p-1 backdrop-blur-md"
      >
        <ToggleButton
          active={cycle === 'monthly'}
          onClick={() => onChange('monthly')}
          label="Mensual"
        />
        <ToggleButton
          active={cycle === 'annual'}
          onClick={() => onChange('annual')}
          label="Anual -20%"
        />
      </div>
      {cycle === 'annual' ? (
        <p className="font-body text-text-secondary text-sm">Ahorra 2 meses con el plan anual</p>
      ) : null}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={[
        'px-5 py-2 rounded-full font-display uppercase tracking-wide text-xs md:text-sm transition-all',
        active
          // Wave 3c (T3c.1): cyan toggle shadow → neon jade rgba(0,255,157,*).
          ? 'bg-primary text-bg shadow-[0_0_16px_rgba(0,255,157,0.45)]'
          : 'text-text-secondary hover:text-primary',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
