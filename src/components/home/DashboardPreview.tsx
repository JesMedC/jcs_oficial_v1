import { GlassCard } from '../GlassCard';

/*
 * p1c — Dashboard preview mockup shown alongside the Home hero.
 *
 * Uses semantic finance colors (`profit` green, `loss` red) per design
 * tokens. No real data wiring — this is a static visual mock.
 */
export function DashboardPreview() {
  return (
    <div className="w-full max-w-xl mx-auto md:ml-auto">
      <GlassCard variant="elevated" className="p-6 md:p-7">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="font-display uppercase tracking-wide text-text-muted text-xs">Resumen</p>
            <h3 className="font-display uppercase tracking-wide text-sm md:text-base">
              Todas las cuentas
            </h3>
          </div>
          <span className="font-mono text-text-muted text-xs">20 may. - 16 jun. 2024</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Kpi
            label="Balance total"
            value="$24,650.75"
            delta="+8.42% desde el periodo anterior"
            tone="profit"
          />
          <Kpi label="Operaciones" value="324" delta="+15.2%" tone="profit" />
          <Kpi label="P&L neto" value="$2,186.45" delta="+12.4%" tone="profit" />
          <Kpi label="Win rate" value="63%" delta="" tone="muted" />
        </div>

        <div className="mt-5">
          <Sparkline />
        </div>

        <div className="mt-6 space-y-2">
          <DistributionRow label="Ganadoras" count={204} percent={63} tone="profit" />
          <DistributionRow label="Perdedoras" count={120} percent={37} tone="loss" />
          <DistributionRow label="Break-even" count={0} percent={0} tone="muted" />
        </div>

        <div className="mt-6">
          <h4 className="font-display uppercase tracking-wide text-text-muted text-xs mb-2">
            Operaciones recientes
          </h4>
          <ul className="divide-y divide-primary/10">
            <RecentRow
              symbol="EUR/USD"
              side="Compra"
              lots="0.50"
              pnl="+$82.45"
              time="16 jun. 14:32"
            />
            <RecentRow
              symbol="GBP/JPY"
              side="Venta"
              lots="0.30"
              pnl="+$58.20"
              time="16 jun. 11:07"
            />
            <RecentRow
              symbol="AUD/USD"
              side="Compra"
              lots="0.40"
              pnl="-$43.10"
              time="16 jun. 09:21"
            />
            <RecentRow
              symbol="USD/JPY"
              side="Compra"
              lots="1.00"
              pnl="-$58.00"
              time="15 jun. 19:43"
            />
          </ul>
        </div>
      </GlassCard>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly tone: 'profit' | 'loss' | 'muted';
}) {
  const deltaTone =
    tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-text-muted';
  return (
    <div className="bg-surface/40 border border-primary/15 rounded-xl p-3">
      <p className="font-display uppercase tracking-wide text-text-muted text-[10px] md:text-xs">
        {label}
      </p>
      <p className="font-mono text-text-primary text-lg md:text-xl mt-1">{value}</p>
      {delta !== '' ? (
        <p className={`font-body text-[11px] md:text-xs mt-0.5 ${deltaTone}`}>{delta}</p>
      ) : null}
    </div>
  );
}

function Sparkline() {
  return (
    <div className="bg-surface/40 border border-primary/15 rounded-xl p-3">
      <p className="font-display uppercase tracking-wide text-text-muted text-[10px] md:text-xs mb-2">
        Evolucion
      </p>
      <svg
        viewBox="0 0 60 20"
        className="w-full h-12"
        role="img"
        aria-label="Evolucion del balance"
      >
        <path
          d="M0,15 L8,12 L16,14 L24,9 L32,11 L40,6 L48,8 L56,3 L60,5"
          fill="none"
          stroke="#00FF9D" // Wave 3c (T3c.1): old-jade hex stroke → neon jade hex.
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function DistributionRow({
  label,
  count,
  percent,
  tone,
}: {
  readonly label: string;
  readonly count: number;
  readonly percent: number;
  readonly tone: 'profit' | 'loss' | 'muted';
}) {
  const fill = tone === 'profit' ? 'bg-profit' : tone === 'loss' ? 'bg-loss' : 'bg-text-muted';
  const text =
    tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-text-muted';
  return (
    <div className="flex items-center gap-3 text-xs font-body">
      <span className="w-24 text-text-secondary">{label}</span>
      <div className="flex-1 h-2 bg-surface-el/60 rounded-full overflow-hidden">
        <div
          className={`h-full ${fill}`}
          style={{ width: `${Math.max(2, percent)}%` }}
          aria-hidden="true"
        />
      </div>
      <span className={`font-mono w-20 text-right ${text}`}>
        {count} ({percent}%)
      </span>
    </div>
  );
}

function RecentRow({
  symbol,
  side,
  lots,
  pnl,
  time,
}: {
  readonly symbol: string;
  readonly side: string;
  readonly lots: string;
  readonly pnl: string;
  readonly time: string;
}) {
  const positive = pnl.startsWith('+');
  return (
    <li className="flex items-center justify-between gap-2 py-2 text-xs md:text-sm">
      <span className="font-mono text-text-primary">{symbol}</span>
      <span className="text-text-secondary font-body">{side}</span>
      <span className="font-mono text-text-secondary">{lots}</span>
      <span
        className={`font-mono ${positive ? 'text-profit' : 'text-loss'}`}
        aria-label={positive ? 'Ganancia' : 'Perdida'}
      >
        {pnl}
      </span>
      <span className="font-body text-text-muted">{time}</span>
    </li>
  );
}
