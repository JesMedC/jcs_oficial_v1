/*
 * CashflowPanel — Módulo 1 / HUD Principal.
 *
 * Compact "vault" panel: balance grande en JetBrains Mono + Jade con
 * glow, debajo dos micro-indicadores (verde = depósitos, rojo =
 * retiros) para que el usuario sepa cuánto del capital es inyectado
 * vs. generado por la operatoria.
 *
 * Render shape: single tile inside the dashboard summary row. Mobile
 * responsive: balance shrinks to 2xl, micro-row stays inline.
 */
import type { CashflowSummary } from '../../features/dashboard/types';

interface Props {
  readonly data: CashflowSummary;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

export function CashflowPanel({ data }: Props) {
  return (
    <div
      data-testid="dash-cashflow"
      className="relative rounded-xl border border-[rgba(0,255,157,0.18)] bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6 overflow-hidden"
    >
      {/* Vault glyph — small ornamental dot grid in the corner */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-2 -right-2 w-24 h-24 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(0,255,157,0.45) 1px, transparent 1.5px)',
          backgroundSize: '8px 8px',
        }}
      />

      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
          style={{ boxShadow: '0 0 6px #00FF9D' }}
          aria-hidden="true"
        />
        <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
          Caja fuerte
        </span>
      </div>

      <div className="mt-2">
        <span
          className="font-mono text-3xl md:text-4xl font-semibold text-[#00FF9D]"
          style={{
            textShadow: '0 0 14px rgba(0,255,157,0.55), 0 0 4px rgba(0,255,157,0.9)',
          }}
          data-testid="dash-balance"
        >
          {formatUsd(data.balance)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="border border-[rgba(53,208,127,0.30)] rounded-lg px-3 py-2">
          <div className="font-display uppercase tracking-wide text-[10px] text-text-muted">
            Depositado
          </div>
          <div
            className="font-mono text-sm md:text-base text-[#35D07F] mt-0.5"
            style={{ textShadow: '0 0 6px rgba(53,208,127,0.5)' }}
          >
            ▲ {formatUsd(data.totalDeposits)}
          </div>
        </div>
        <div className="border border-[rgba(255,42,85,0.30)] rounded-lg px-3 py-2">
          <div className="font-display uppercase tracking-wide text-[10px] text-text-muted">
            Retirado
          </div>
          <div
            className="font-mono text-sm md:text-base text-[#FF2A55] mt-0.5"
            style={{ textShadow: '0 0 6px rgba(255,42,85,0.5)' }}
          >
            ▼ {formatUsd(data.totalWithdrawals)}
          </div>
        </div>
      </div>
    </div>
  );
}
