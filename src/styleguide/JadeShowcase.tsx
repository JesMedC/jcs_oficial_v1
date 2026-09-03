/*
 * design-system-v1 — `/styleguide/jade` route (Wave 6, T6.3).
 *
 * Public styleguide that exposes every Cyber-Jade token, primitive,
 * and decorative asset in one place. Six required sections per
 * `specs/styleguide-jade/spec.md`:
 *   1. Color tokens — swatch grid (8 hex)
 *   2. Typography — display / body / mono stack samples
 *   3. Glow + glass — primary / ghost / danger buttons + glass card
 *   4. Primitives — every primitive from `src/components/ui/`
 *   5. Decor — DotGrid + NeuralNetwork with live opacity + nodeCount
 *      controls
 *   6. Anti-patterns — 3 forbidden examples each marked with
 *      `data-state="forbidden"`
 *
 * The route is dark-mode-locked — `<html data-theme="dark">` is set
 * on mount and cleaned up on unmount (the spec is explicit: NO
 * theme toggle). The route is registered in `src/router/config.tsx`
 * as a lazy chunk per the existing `/styleguide/glass` pattern.
 *
 * Visual contract:
 *   - container: full-viewport `bg-bg text-text-primary`
 *   - page padding: generous `p-8` (Tailwind 32px) so the dense
 *     primitive grid has room to breathe
 *   - section headers: `font-display uppercase tracking-wide
 *     text-primary` so the page reads as a "manual" rather than a
 *     marketing landing
 *   - `<DotGrid opacity={0.06}>` decor at the top of the page (the
 *     user explicitly wanted visible impact for Wave 6; the
 *     styleguide route is the first surface to demonstrate the
 *     decor primitive at production-grade opacity)
 */
import { useEffect, useState } from 'react';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusDot } from '../components/ui/StatusDot';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { Textarea } from '../components/ui/Textarea';
import { ToastContainer } from '../components/ui/ToastContainer';
import { DotGrid } from '../components/decor/DotGrid';
import { NeuralNetwork } from '../components/decor/NeuralNetwork';
import { GlassCard } from '../components/common/GlassCard';
import { useToastStore } from '../stores/useToastStore';

/*
 * ---------------------------------------------------------------------------
 * Section 1 — Color tokens
 * ---------------------------------------------------------------------------
 */
interface TokenSwatch {
  readonly token: string;
  readonly hex: string;
  readonly role: string;
}

const COLOR_TOKENS: ReadonlyArray<TokenSwatch> = [
  { token: 'bg', hex: '#060B10', role: 'Page background' },
  { token: 'surface', hex: '#0D151E', role: 'Card / panel surface' },
  { token: 'surface-el', hex: '#111B24', role: 'Elevated surface' },
  { token: 'primary', hex: '#00FF9D', role: 'Cyber-Jade neon' },
  { token: 'profit', hex: '#35D07F', role: 'Positive P&L' },
  { token: 'loss', hex: '#FF2A55', role: 'Negative P&L' },
  { token: 'warning', hex: '#F3B94E', role: 'Warning state' },
  { token: 'info', hex: '#00B8FF', role: 'AI / info accent' },
  { token: 'border', hex: '#1C2A35', role: 'Subtle border' },
  { token: 'input', hex: '#0A1017', role: 'Form control bg' },
  { token: 'text.primary', hex: '#E0E6ED', role: 'Body copy' },
  { token: 'text.secondary', hex: '#8A9BA8', role: 'Supporting copy' },
  { token: 'text.muted', hex: '#607080', role: 'Disabled / tertiary' },
];

function ColorSection(): JSX.Element {
  return (
    <section
      aria-labelledby="section-colors"
      className="mb-12"
      data-section="colors"
    >
      <h2
        id="section-colors"
        className="text-2xl font-display uppercase tracking-wide mb-2 text-primary"
      >
        1. Color tokens
      </h2>
      <p className="text-text-secondary font-body text-sm mb-6 max-w-2xl">
        Every Cyber-Jade token is exposed as a Tailwind utility via
        {' '}<code className="text-primary font-mono">bg-{`{token}`}</code>,
        {' '}<code className="text-primary font-mono">text-{`{token}`}</code>,
        {' '}<code className="text-primary font-mono">border-{`{token}`}</code>.
        The decorative 4–6% opacity backdrop sits behind this grid.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {COLOR_TOKENS.map((swatch) => (
          <div
            key={swatch.token}
            className="flex flex-col items-start"
            data-token={swatch.token}
          >
            <div
              className="h-20 w-20 rounded-lg border border-white/10"
              style={{ backgroundColor: swatch.hex }}
              aria-hidden="true"
            />
            <div className="mt-2 font-display uppercase tracking-wide text-text-primary text-sm">
              {swatch.token}
            </div>
            <div className="font-mono text-xs text-primary">{swatch.hex}</div>
            <div className="font-body text-xs text-text-secondary">
              {swatch.role}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/*
 * ---------------------------------------------------------------------------
 * Section 2 — Typography
 * ---------------------------------------------------------------------------
 */
function TypographyRow({
  label,
  fontFamily,
  samples,
}: {
  readonly label: string;
  readonly fontFamily: string;
  readonly samples: ReadonlyArray<{ readonly size: string; readonly text: string }>;
}): JSX.Element {
  return (
    <div className="mb-6" data-typography={label}>
      <div className="text-text-muted text-xs uppercase tracking-wide font-display mb-2">
        {label}
      </div>
      <div className="space-y-1" style={{ fontFamily }}>
        {samples.map((sample) => (
          <div
            key={sample.size}
            className="text-text-primary"
            style={{ fontSize: sample.size }}
          >
            {sample.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function TypographySection(): JSX.Element {
  return (
    <section
      aria-labelledby="section-typography"
      className="mb-12"
      data-section="typography"
    >
      <h2
        id="section-typography"
        className="text-2xl font-display uppercase tracking-wide mb-2 text-primary"
      >
        2. Typography
      </h2>
      <p className="text-text-secondary font-body text-sm mb-6 max-w-2xl">
        Display stack (Orbitron / Rajdhani / Space Grotesk) for chrome
        and KPI labels. Body (Inter) for paragraphs. Mono (JetBrains
        Mono) for tabular numbers — never apply glow or gradient to
        numeric cells.
      </p>
      <div className="space-y-4">
        <TypographyRow
          label="Display (Orbitron / Rajdhani / Space Grotesk)"
          fontFamily="'Orbitron', 'Rajdhani', 'Space Grotesk', ui-monospace, monospace"
          samples={[
            { size: '14px', text: 'KPI LABEL · small 12' },
            { size: '18px', text: 'KPI label · base' },
            { size: '24px', text: 'KPI LABEL · large' },
          ]}
        />
        <TypographyRow
          label="Body (Inter)"
          fontFamily="'Inter', system-ui, sans-serif"
          samples={[
            { size: '14px', text: 'Body copy · small (14px)' },
            { size: '16px', text: 'Body copy · base (16px)' },
            { size: '20px', text: 'Body copy · large (20px)' },
          ]}
        />
        <TypographyRow
          label="Mono (JetBrains Mono)"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          samples={[
            { size: '12px', text: '12345.67 · small mono' },
            { size: '14px', text: '$48,920.55 · base mono' },
            { size: '18px', text: '+1.240R (0.41%) · large mono' },
          ]}
        />
      </div>
    </section>
  );
}

/*
 * ---------------------------------------------------------------------------
 * Section 3 — Glow + Glass
 * ---------------------------------------------------------------------------
 */
function GlowSection(): JSX.Element {
  return (
    <section
      aria-labelledby="section-glow"
      className="mb-12"
      data-section="glow"
    >
      <h2
        id="section-glow"
        className="text-2xl font-display uppercase tracking-wide mb-2 text-primary"
      >
        3. Glow + glass
      </h2>
      <p className="text-text-secondary font-body text-sm mb-6 max-w-2xl">
        Glow is allowed ONLY on chrome (buttons, badges, modals). It is
        forbidden on financial data surfaces (trade tables, P&amp;L
        calendars, scanner alerts). Hover the buttons to see the
        jade glow.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="primary">Primary CTA</Button>
        <Button variant="ghost">Ghost action</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="primary" loading>
          Cargando
        </Button>
      </div>
      <GlassCard glow="jade" className="max-w-md" data-glow-primary="true">
        <div className="font-display uppercase tracking-wide text-primary text-sm">
          GlassCard · glow=jade
        </div>
        <div className="font-mono text-text-primary text-2xl mt-2">
          $48,920.55
        </div>
        <div className="text-text-secondary text-sm mt-2">
          Translucent panel used for content cards. Hover the card to
          see the jade glow halo.
        </div>
      </GlassCard>
    </section>
  );
}

/*
 * ---------------------------------------------------------------------------
 * Section 4 — Primitives
 * ---------------------------------------------------------------------------
 */
interface TradeRow {
  readonly id: string;
  readonly symbol: string;
  readonly side: 'BUY' | 'SELL';
  readonly pnl: number;
  readonly status: 'OPEN' | 'CLOSED';
}

const SAMPLE_TRADES: ReadonlyArray<TradeRow> = [
  { id: 't1', symbol: 'EURUSD', side: 'BUY', pnl: 240.5, status: 'OPEN' },
  { id: 't2', symbol: 'GBPUSD', side: 'SELL', pnl: -85.25, status: 'CLOSED' },
  { id: 't3', symbol: 'USDJPY', side: 'BUY', pnl: 1280.0, status: 'OPEN' },
  { id: 't4', symbol: 'XAUUSD', side: 'SELL', pnl: -420.75, status: 'CLOSED' },
  { id: 't5', symbol: 'AUDUSD', side: 'BUY', pnl: 95.4, status: 'CLOSED' },
];

const TRADE_COLUMNS: ReadonlyArray<ColumnDef<TradeRow>> = [
  { key: 'symbol', header: 'Symbol', width: '30%' },
  {
    key: 'side',
    header: 'Side',
    width: '20%',
    sortable: true,
    sortAccessor: (row) => row.side,
  },
  {
    key: 'pnl',
    header: 'P&L',
    align: 'right',
    width: '25%',
    sortable: true,
    sortAccessor: (row) => row.pnl,
    cell: (row) => (
      <span className={row.pnl >= 0 ? 'text-profit font-mono' : 'text-loss font-mono'}>
        {row.pnl >= 0 ? '+' : ''}
        {row.pnl.toFixed(2)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '25%',
    cell: (row) =>
      row.status === 'OPEN' ? (
        <Badge variant="primary" size="sm">
          Open
        </Badge>
      ) : (
        <Badge variant="neutral" size="sm">
          Closed
        </Badge>
      ),
  },
];

function PrimitivesSection(): JSX.Element {
  const TAB_ITEMS: ReadonlyArray<TabItem> = [
    {
      key: 'overview',
      label: 'Overview',
      panel: (
        <div className="text-text-secondary font-body text-sm">
          Overview panel — the default tab when the route mounts.
        </div>
      ),
    },
    {
      key: 'details',
      label: 'Details',
      panel: (
        <div className="text-text-secondary font-body text-sm">
          Details panel — render long-form content here. Use ArrowLeft
          / ArrowRight to cycle, Home/End to jump to the first/last
        tab.
        </div>
      ),
    },
    {
      key: 'history',
      label: 'History',
      panel: (
        <div className="text-text-secondary font-body text-sm">
          History panel — disabled example not shown here; consumers
          set <code className="text-primary font-mono">disabled</code>
          {' '}on the tab item to opt out.
        </div>
      ),
    },
  ];

  return (
    <section
      aria-labelledby="section-primitives"
      className="mb-12"
      data-section="primitives"
    >
      <h2
        id="section-primitives"
        className="text-2xl font-display uppercase tracking-wide mb-2 text-primary"
      >
        4. Primitives
      </h2>
      <p className="text-text-secondary font-body text-sm mb-6 max-w-2xl">
        Every primitive from
        {' '}<code className="text-primary font-mono">src/components/ui/</code>
        {' '}in a usage example. Wave 5 migrates the consumer pages to
        these.
      </p>

      <div className="space-y-8">
        {/* Buttons */}
        <div data-primitive="button">
          <h3 className="text-sm font-display uppercase tracking-wide text-text-secondary mb-2">
            Button
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm">
              Primary sm
            </Button>
            <Button variant="primary" size="md">
              Primary md
            </Button>
            <Button variant="primary" size="lg">
              Primary lg
            </Button>
            <Button variant="ghost" size="md">
              Ghost
            </Button>
            <Button variant="danger" size="md">
              Danger
            </Button>
            <Button variant="icon" size="md" aria-label="Cerrar">
              ✕
            </Button>
          </div>
        </div>

        {/* Form fields */}
        <div data-primitive="fields" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Input · default"
            placeholder="placeholder"
            hint="Hint text appears below the field."
          />
          <Input
            label="Input · error"
            placeholder="placeholder"
            error="Este campo es obligatorio."
          />
          <Select
            label="Select"
            options={[
              { value: 'starter', label: 'Starter' },
              { value: 'plus', label: 'Plus' },
              { value: 'elite', label: 'Elite' },
            ]}
            defaultValue="plus"
          />
          <Textarea
            label="Textarea"
            placeholder="Anota tu tesis de trading..."
            hint="Soporta multilinea."
          />
        </div>

        {/* Badge variants */}
        <div data-primitive="badge">
          <h3 className="text-sm font-display uppercase tracking-wide text-text-secondary mb-2">
            Badge
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">Primary</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="profit">Profit</Badge>
            <Badge variant="loss">Loss</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="danger">Danger</Badge>
          </div>
        </div>

        {/* StatusDot variants */}
        <div data-primitive="status-dot">
          <h3 className="text-sm font-display uppercase tracking-wide text-text-secondary mb-2">
            StatusDot
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <StatusDot variant="jade" label="Jade live" />
              <span className="text-text-secondary text-sm">jade (pulse)</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <StatusDot variant="cyan" pulse label="Cyan live" />
              <span className="text-text-secondary text-sm">cyan (pulse on)</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <StatusDot variant="amber" label="Amber" />
              <span className="text-text-secondary text-sm">amber</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <StatusDot variant="red" label="Red" />
              <span className="text-text-secondary text-sm">red</span>
            </span>
          </div>
        </div>

        {/* DataTable */}
        <div data-primitive="data-table">
          <h3 className="text-sm font-display uppercase tracking-wide text-text-secondary mb-2">
            DataTable (5 sample rows, sortable)
          </h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <DataTable<TradeRow>
              columns={TRADE_COLUMNS}
              rows={SAMPLE_TRADES}
              rowKey={(row) => row.id}
              initialSort={{ key: 'pnl', direction: 'desc' }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div data-primitive="tabs">
          <h3 className="text-sm font-display uppercase tracking-wide text-text-secondary mb-2">
            Tabs (3 tabs)
          </h3>
          <Tabs items={TAB_ITEMS} defaultActiveKey="overview" />
        </div>

        {/* EmptyState */}
        <div data-primitive="empty-state">
          <h3 className="text-sm font-display uppercase tracking-wide text-text-secondary mb-2">
            EmptyState
          </h3>
          <div className="rounded-lg border border-border bg-surface/40">
            <EmptyState
              title="Sin trades todavia"
              description="Abre tu primera operacion desde el dashboard para empezar a registrar el journal."
              cta={<Button variant="primary">Nueva operacion</Button>}
            />
          </div>
        </div>

        {/* Skeleton */}
        <div data-primitive="skeleton">
          <h3 className="text-sm font-display uppercase tracking-wide text-text-secondary mb-2">
            Skeleton (text ×3 + circle + rect)
          </h3>
          <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-surface/40">
            <Skeleton variant="circle" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" count={3} />
            </div>
            <Skeleton variant="rect" width="120px" height="64px" />
          </div>
        </div>

        {/* Toast — pushed by ToastDemoSection on mount */}
      </div>
    </section>
  );
}

/*
 * ---------------------------------------------------------------------------
 * Section 5 — Decor (DotGrid + NeuralNetwork with live controls)
 * ---------------------------------------------------------------------------
 */
function DecorSection(): JSX.Element {
  const [dotOpacity, setDotOpacity] = useState<number>(0.06);
  const [nodeCount, setNodeCount] = useState<number>(18);

  return (
    <section
      aria-labelledby="section-decor"
      className="mb-12"
      data-section="decor"
    >
      <h2
        id="section-decor"
        className="text-2xl font-display uppercase tracking-wide mb-2 text-primary"
      >
        5. Decor
      </h2>
      <p className="text-text-secondary font-body text-sm mb-6 max-w-2xl">
        Decorative VFX reserved for chrome surfaces — never on
        data-dense tables, P&amp;L calendars, or scanner alerts. The
        live controls below update both backgrounds in real time.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-border p-4 bg-surface/40">
          <div className="font-display uppercase tracking-wide text-text-primary text-sm mb-2">
            DotGrid
          </div>
          <label className="flex items-center gap-3 text-text-secondary text-xs font-mono">
            <span className="w-16">opacity</span>
            <input
              type="range"
              min={0.01}
              max={0.1}
              step={0.01}
              value={dotOpacity}
              onChange={(e) => setDotOpacity(Number(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="DotGrid opacity"
            />
            <span className="w-12 text-right text-primary">{dotOpacity.toFixed(2)}</span>
          </label>
        </div>
        <div className="rounded-lg border border-border p-4 bg-surface/40">
          <div className="font-display uppercase tracking-wide text-text-primary text-sm mb-2">
            NeuralNetwork
          </div>
          <label className="flex items-center gap-3 text-text-secondary text-xs font-mono">
            <span className="w-16">nodes</span>
            <input
              type="range"
              min={6}
              max={24}
              step={1}
              value={nodeCount}
              onChange={(e) => setNodeCount(Number(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="NeuralNetwork node count"
            />
            <span className="w-12 text-right text-primary">{nodeCount}</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative h-64 rounded-lg border border-border overflow-hidden bg-bg">
          <DotGrid opacity={dotOpacity} />
          <div className="relative z-10 p-6 font-display uppercase tracking-wide text-text-secondary text-xs">
            DotGrid preview · opacity {dotOpacity.toFixed(2)}
          </div>
        </div>
        <div className="relative h-64 rounded-lg border border-border overflow-hidden bg-bg">
          <NeuralNetwork nodeCount={nodeCount} edgeDensity={0.3} />
          <div className="relative z-10 p-6 font-display uppercase tracking-wide text-text-secondary text-xs">
            NeuralNetwork preview · {nodeCount} nodes
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * ---------------------------------------------------------------------------
 * ToastDemo — pushes 3 sample toasts on mount so the showcase renders
 * the Toast primitive immediately. Lives in its own component so the
 * push() side-effect (via Zustand subscription) is scoped to the
 * showcase's lifetime.
 * ---------------------------------------------------------------------------
 */
function ToastDemo(): JSX.Element {
  const push = useToastStore((state) => state.push);

  useEffect(() => {
    push({ message: 'Trade abierto: EURUSD BUY', severity: 'success' });
    push({ message: 'Sincronizando con el broker...', severity: 'info' });
    push({ message: 'Drawdown semanal -1.8%', severity: 'warning' });
  }, [push]);

  return (
    <div data-primitive="toast" className="mb-6">
      <h3 className="text-sm font-display uppercase tracking-wide text-text-secondary mb-2">
        Toast (3 sample toasts via store.push)
      </h3>
      <p className="text-text-muted text-xs font-body max-w-2xl">
        The toasts pushed above render through <code className="text-primary font-mono">{'<ToastContainer />'}</code>
        {' '}mounted at the page root. They auto-dismiss after the
        severity default (success 3s / info 4s / warning 4s).
      </p>
    </div>
  );
}

/*
 * ---------------------------------------------------------------------------
 * Section 6 — Anti-patterns
 * ---------------------------------------------------------------------------
 */
function AntiPatternsSection(): JSX.Element {
  return (
    <section
      aria-labelledby="section-antipatterns"
      className="mb-12"
      data-section="antipatterns"
    >
      <h2
        id="section-antipatterns"
        className="text-2xl font-display uppercase tracking-wide mb-2 text-primary"
      >
        6. Anti-patterns
      </h2>
      <p className="text-text-secondary font-body text-sm mb-6 max-w-2xl">
        Forbidden patterns — these examples show what
        {' '}<strong className="text-loss">NOT</strong>
        {' '}to do. Each carries
        {' '}<code className="text-primary font-mono">data-state=&quot;forbidden&quot;</code>
        {' '}so a future lint rule (T7.1) or review checklist can target them.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          data-state="forbidden"
          className="rounded-lg border border-loss/40 p-4 bg-loss/5"
        >
          <div className="font-display uppercase tracking-wide text-loss text-sm">
            Cyan rgba inline
          </div>
          <pre className="mt-2 font-mono text-xs text-text-secondary whitespace-pre-wrap">
{`style={{
  textShadow:
    '0 0 20px rgba(0,255,255,0.4)',
}}`}
          </pre>
          <div className="mt-2 text-text-muted text-xs font-body">
            Use the jade rgba or a glow shadow utility instead.
          </div>
        </div>

        <div
          data-state="forbidden"
          className="rounded-lg border border-loss/40 p-4 bg-loss/5"
        >
          <div className="font-display uppercase tracking-wide text-loss text-sm">
            Hardcoded jade hex
          </div>
          <pre className="mt-2 font-mono text-xs text-text-secondary whitespace-pre-wrap">
{`<svg>
  <circle
    fill="#00FF9D"
    stroke="#00FF9D" />
</svg>`}
          </pre>
          <div className="mt-2 text-text-muted text-xs font-body">
            Use <code className="text-primary font-mono">fill=&quot;currentColor&quot;</code>
            {' '}or pull from the Tailwind token.
          </div>
        </div>

        <div
          data-state="forbidden"
          className="rounded-lg border border-loss/40 p-4 bg-loss/5"
        >
          <div className="font-display uppercase tracking-wide text-loss text-sm">
            Jade-button class dup
          </div>
          <pre className="mt-2 font-mono text-xs text-text-secondary whitespace-pre-wrap">
{`<button
  className="bg-primary text-bg
             font-display uppercase
             tracking-wide
             px-4 py-2 rounded-lg">
  Aceptar
</button>`}
          </pre>
          <div className="mt-2 text-text-muted text-xs font-body">
            Use
            {' '}<code className="text-primary font-mono">{'<Button variant="primary" />'}</code>
            {' '}— the recipe is owned by the primitive.
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * ---------------------------------------------------------------------------
 * Page composition
 * ---------------------------------------------------------------------------
 */
export function JadeShowcase(): JSX.Element {
  // Dark-mode-lock contract from specs/styleguide-jade/spec.md —
  // set `<html data-theme="dark">` on mount and clean up on unmount.
  // The route has no theme toggle (the spec is explicit).
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'dark');
    return () => {
      if (previous === null) {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', previous);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text-primary" data-page="jade-styleguide">
      {/* Top-of-page DotGrid — visible impact for Wave 6 */}
      <div className="relative">
        <DotGrid opacity={0.06} />
        <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-12">
          <header className="space-y-2">
            <div className="font-display uppercase tracking-[0.3em] text-primary text-xs">
              design-system-v1 / Wave 6 · Cyber-Jade
            </div>
            <h1 className="font-display uppercase tracking-wide text-text-primary text-2xl md:text-4xl">
              Jade tokens, primitives &amp; decor
            </h1>
            <p className="text-text-secondary font-body text-sm md:text-base max-w-2xl">
              Canonical reference of the Cyber-Jade design system. Six
              sections walk through the token palette, typography
              stacks, glow + glass chrome, every primitive, the
              decorative VFX layer, and the forbidden patterns the
              Wave 7 lint rule will catch.
            </p>
          </header>

          <ColorSection />
          <TypographySection />
          <GlowSection />
          <PrimitivesSection />
          <ToastDemo />
          <DecorSection />
          <AntiPatternsSection />

          <footer className="pt-8 border-t border-border text-text-muted font-body text-xs">
            design-system-v1 — preview tool for Wave 6 retro + Wave 7
            enforcement reviews.
          </footer>
        </div>
      </div>

      {/*
       * ToastContainer mounts the live toast queue at the page root.
       * It renders nothing when the queue is empty (see
       * src/components/ui/ToastContainer.tsx).
       */}
      <ToastContainer />
    </div>
  );
}

export default JadeShowcase;