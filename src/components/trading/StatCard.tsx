/*
 * Cyber-Jade — StatCard.
 *
 * Compact metric tile used in the trading overview strip. Each card
 * shows: a tiny uppercase label (Orbitron jade), the big number
 * (JetBrains Mono), and an optional delta or trend indicator.
 *
 * The card itself uses the same glassmorphism surface as GlassCard
 * (rgba(13,21,30,0.7) + blur(12px) + jade border) but with tighter
 * padding so multiple cards sit side-by-side in a row.
 */
import type { ReactNode } from 'react';

export type StatCardAccent = 'jade' | 'profit' | 'loss' | 'warning' | 'muted';

export interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly delta?: string;
  readonly accent?: StatCardAccent;
  readonly rightSlot?: ReactNode;
}

const ACCENT_VALUE: Record<StatCardAccent, string> = {
  jade: 'text-primary',
  profit: 'text-[#35D07F]',
  loss: 'text-[#FF2A55]',
  warning: 'text-[#F3B94E]',
  muted: 'text-text-primary',
};

const ACCENT_GLOW: Record<StatCardAccent, string> = {
  jade: '[text-shadow:0_0_8px_rgba(0,255,157,0.4)]',
  profit: '[text-shadow:0_0_8px_rgba(53,208,127,0.4)]',
  loss: '[text-shadow:0_0_8px_rgba(255,42,85,0.4)]',
  warning: '[text-shadow:0_0_8px_rgba(243,185,78,0.4)]',
  muted: '',
};

const ACCENT_DELTA: Record<StatCardAccent, string> = {
  jade: 'text-primary',
  profit: 'text-[#35D07F]',
  loss: 'text-[#FF2A55]',
  warning: 'text-[#F3B94E]',
  muted: 'text-text-muted',
};

export function StatCard({
  label,
  value,
  delta,
  accent = 'jade',
  rightSlot,
}: StatCardProps) {
  return (
    <div
      className={[
        'relative bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px]',
        'border border-[rgba(0,255,157,0.15)] rounded-lg px-4 py-3',
        'flex flex-col gap-1.5 min-w-0 opacity-70',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display uppercase tracking-wider text-[10px] text-text-muted truncate">
          {label}
        </span>
        {rightSlot}
      </div>
      <span
        className={[
          'font-mono text-xl md:text-2xl font-medium truncate',
          ACCENT_VALUE[accent],
          ACCENT_GLOW[accent],
        ].join(' ')}
      >
        {value}
      </span>
      {delta !== undefined ? (
        <span
          className={[
            'font-mono text-[11px]',
            ACCENT_DELTA[accent],
          ].join(' ')}
        >
          {delta}
        </span>
      ) : null}
    </div>
  );
}
