# Design: design-system-v1 — Adopt Cyber-Jade design language

> Change: `design-system-v1`
> Project: `jcs_oficial` — frontend-only SPA (React 18.3 + Vite 5 + TS 5.5 + Tailwind 3.4 + Zustand 4 + TanStack Query 5 + RHF 7)
> Mode: openspec
> Companion artifacts: `proposal.md`, `specs/{cyber-jade-tokens,primitive-library,decorative-system,styleguide-jade,style-enforcement,color-system,portal-shell,topbar}/spec.md`

This design is binding for `sdd-apply` and `sdd-tasks`. It translates the 8 specs into a concrete implementation architecture: token patches, primitive contracts, decorative assets, styleguide route, 7-wave migration sequencing, enforcement, and risk-bound decisions. Tests live next to source; TDD is mandatory per repo policy.

## 1. Architecture overview — the seven layers

```
Layer 0  tailwind.config.ts               (tokens, keyframes, animations, boxShadow, backdropBlur)
Layer 1  src/styles/index.css              (CSS vars, base styles, ::selection, :focus-visible, reduced-motion)
Layer 2  src/components/ui/                (primitives — Button, Input, Select, Textarea, Badge,
                                            StatusDot, DataTable, Tabs, EmptyState, Skeleton, Toast,
                                            [OPTIONAL] PeriodoSplit)
Layer 3  src/components/decor/             (DotGrid, NeuralNetwork — SVG presentational only)
Layer 4  src/components/{portal,admin,home,common,...}/   (feature components — consume primitives)
Layer 5  src/pages/**                       (page surfaces — compose features + primitives + decor)
Layer 6  src/styleguide/JadeShowcase.tsx    (route /styleguide/jade — visual contract)
```

Spec→layer mapping:

| Spec | Primary layer | Also touches |
|---|---|---|
| `cyber-jade-tokens` | L0+L1 | L2 (primitives consume tokens) |
| `primitive-library` | L2 | L1 (focus-visible ring) |
| `decorative-system` | L3 | L0 (`statusDotPulse` keyframe), L2 (`StatusDot`) |
| `styleguide-jade` | L6 | L0, L1, L2, L3 (showcase renders everything) |
| `style-enforcement` | tooling + `docs/` | ESLint flat config, CI grep guard |
| `color-system` (delta) | L0+L1 | L4 (re-skin glow targets) |
| `portal-shell` (delta) | L4 | L2 (gated by Primitive availability) |
| `topbar` (delta) | L4 | L2 (`PeriodoSplit`, optional) |

The existing `src/components/common/{GlassPanel,GlassCard,GlassModal,GlassDrawer}` family is OUT OF SCOPE for `src/components/ui/`. Those primitives own glassmorphism; the new `ui/` primitives own the design-system chrome (buttons, inputs, tables, toasts). They compose, never replace, the glass family.

## 2. Token system implementation

### 2.1 `tailwind.config.ts` patch — `theme.extend.colors`

Replace the existing primary ladder (cyan → jade already done in `portal-fase0a-base`, but hex is wrong) and add the new tokens:

```ts
colors: {
  bg:           '#060B10',   // was #080D12
  surface:      '#0D151E',   // was #0D141B
  'surface-el': '#111B24',   // unchanged (no spec drift)
  border:       '#1C2A35',   // unchanged
  input:        '#0A1017',   // NEW — form control bg
  primary: {
    DEFAULT: '#00FF9D',      // was #2EDC8C
    dk:      '#00CC7E',      // was #25B070
    light:   '#5CFFBE',      // was #7FE9B5
    glow:    '#00FF9D',      // was #2EDC8C
  },
  'primary-fg': '#060B10',   // was #080D12
  // Glass tokens unchanged (subtle / DEFAULT / strong / border.*).
  'border-jade': 'rgba(0,255,157,0.2)',   // NEW — default jade border utility
  profit:   '#35D07F',       // unchanged per spec
  loss:     '#FF2A55',       // was #FF5C5C — neon glow variant follows
  danger:   '#FF2A55',       // alias for `loss` to align primitive `variant="danger"`
  warning:  '#F3B94E',       // unchanged
  info:     '#00B8FF',       // was #4DA3FF — secondary cyan / AI-viz
  text: {
    primary:   '#E0E6ED',    // was #E9F1F7
    secondary: '#8A9BA8',    // was #8FA1B2
    muted:     '#607080',    // unchanged
  },
}
```

Notes on the `border-jade` key: Tailwind 3 collapses nested `DEFAULT` keys but flat hyphen keys are emitted literally (see the `glass.border` comment in current `tailwind.config.ts` lines 36-43). Naming the color key `border-jade` requires the hyphen — to avoid the documented nesting trap, name the key `borderJade` and add a CSS variable alias in `:root`. The resulting Tailwind utility is `border-borderJade`; consumers prefer this over ad-hoc `border-primary/20` because it locks opacity at 0.2 and stops drift.

Decision: use `borderJade` as the key. Add `border-jade` as an alias via a custom plugin OR simply document the utility name `border-borderJade`. The latter is cheaper; the former reads cleaner. **Choice: `borderJade` key, utility `border-borderJade`, documented in `docs/design-system.md`.** (Rationale: the current codebase has zero `border-primary/20` aliases; introducing a plugin-only utility creates a fork between ESLint and Tailwind. Sticking with the Tailwind auto-emit keeps the rule "no inline rgba strings" enforceable by the ESLint regex below.)

### 2.2 `src/styles/index.css` — `:root` ordering

Mirror the spec table top-down so a human reading `:root` matches the spec row order:

```css
:root {
  /* Surface */
  --color-jade-bg:          #060B10;
  --color-jade-surface:     #0D151E;
  --color-jade-surface-el:  #111B24;
  --color-jade-border:      #1C2A35;
  --color-jade-input:       #0A1017;
  /* Brand */
  --color-jade:             #00FF9D;
  --color-jade-dk:          #00CC7E;
  --color-jade-light:       #5CFFBE;
  --color-jade-glow:        #00FF9D;
  --color-jade-fg:          #060B10;
  --color-jade-border-line: rgba(0, 255, 157, 0.2);
  /* Semantic */
  --color-jade-profit:      #35D07F;
  --color-jade-loss:        #FF2A55;
  --color-jade-warning:     #F3B94E;
  --color-jade-info:        #00B8FF;
  /* Text */
  --color-jade-text-pri:    #E0E6ED;
  --color-jade-text-sec:    #8A9BA8;
  --color-jade-text-mut:    #607080;
}
```

Replace `::selection`, `:focus-visible`, `.auth-spinner`, `@keyframes auth-pulse`, `@keyframes pulse-cyan` (rename to `statusDotPulse` mirroring `decorative-system` — see §2.5), and the portal-selector radial gradients to jade rgba values.

### 2.3 Mapping the jade rgba values

| Source rgba | New rgba | Where used |
|---|---|---|
| `rgba(0, 255, 157, 0.20)` | primary dk-glow (radius 20px) | `shadow-glow-jade-sm` |
| `rgba(0, 255, 157, 0.30)` | primary glow (radius 40px) | `shadow-glow-jade`, `shadow-glow-jade-md` |
| `rgba(0, 255, 157, 0.50)` | focus ring (radius 5px) | `<Input>` `<Select>` `<Textarea>` focus-visible |
| `rgba(0, 255, 157, 0.20)` | default border | `border-borderJade` utility |
| `rgba(0, 255, 157, 0.16)` | aurora-static gradient | `tailwind.config.ts backgroundImage` |
| `rgba(0, 255, 157, 0.40)` | logo text-shadow | `.glow-primary` and inline `text-shadow` on `<h1>` chrome |
| `rgba(0, 255, 157, 0.05)` | `border-white/[0.05]` aliased | `<DataTable>` row separators (the spec uses `rgba(255,255,255,0.05)` — see §6.7) |

### 2.4 `pulse-cyan` rename → `statusDotPulse`

The proposal calls for the rename. Surface mapping:

| Old | New |
|---|---|
| `@keyframes pulse-cyan` (tailwind.config.ts L86 + index.css L108) | `@keyframes statusDotPulse` |
| `animation.pulse-cyan` (tailwind.config.ts L102) | `animation.statusDotPulse: 'statusDotPulse 1.5s ease-in-out infinite'` |
| `animate-[pulse-cyan_1.2s_ease-in-out_infinite]` (RouteFallback.tsx L13, PaymentSuccessPage.tsx L100) | `animate-status-dot-pulse` (use the named utility, not the arbitrary value) |

**Note:** the existing keyframe uses `0%/100% opacity 0.6, 50% opacity 1` and a 2.4s duration. The new keyframe per `decorative-system` uses `0.5 → 1.0` opacity and 1.5s. The duration change tightens perceived latency in route loading — design improvement, not a regression. The opacity minimum drops from 0.6 to 0.5 because the new keyframe is the "halo" inside `<StatusDot>`, not a free-floating spinner.

### 2.5 Keyframes & animations to add (Wave 1)

| Keyframe | Added in | Used by |
|---|---|---|
| `statusDotPulse` | tailwind.config.ts | `<StatusDot pulse>` |
| `neural-drift` | tailwind.config.ts | `<NeuralNetwork animate="drift">` |
| `shimmer-jade` | tailwind.config.ts | `<Skeleton>` |

Each keyframe's reduced-motion override is in `src/styles/index.css` `@media (prefers-reduced-motion: reduce)` block — already global; the existing block covers all new animations.

## 3. Font pipeline

### 3.1 Dependencies

Add (matching the existing `@fontsource/orbitron` 5.1.0 pattern pinned in `package.json`):

```json
"@fontsource/rajdhani": "5.1.0",
"@fontsource/space-grotesk": "5.1.0"
```

Both ^5.1.0 to align with Orbitron. Install via `pnpm add -D @fontsource/rajdhani@5.1.0 @fontsource/space-grotesk@5.1.0`.

### 3.2 `src/main.tsx` imports

Mirror the existing Orbitron block (lines 14-20):

```ts
import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
```

`font-display: swap` is the default for `@fontsource` packages — no explicit `font-display` override required.

### 3.3 `tailwind.config.ts` `fontFamily.display`

```ts
display: ['Orbitron', 'Rajdhani', 'Space Grotesk', 'ui-monospace', 'monospace'],
```

Rationale: Orbitron stays first because its wide, tracked letterforms carry the cyber-jade identity for hero numbers and h1/h2 (the chrome surfaces where glow is allowed). Rajdhani is a narrower condensed sans that complements Orbitron for sub-headers and KPI labels. Space Grotesk is the humanist body for paragraph display. Monospace fallback prevents heading reflow if all three fail to load — a critical UX guarantee for trading dashboards where layout shift on heading fonts is jarring.

### 3.4 Typography usage rules (codified in `docs/design-system.md`)

| Surface | Stack | Notes |
|---|---|---|
| Hero / h1 / h2 chrome | `font-display` (Orbitron) | Glow allowed |
| Sub-headers / KPI labels | `font-display` (Orbitron → Rajdhani) | No glow |
| Body paragraphs | `font-body` (Inter) | No glow |
| Tabular numbers (P&L, balance, lot_size) | `font-mono` (JetBrains Mono) | Solid color, NO glow, NO gradient |

## 4. Primitive component architecture

All primitives live under `src/components/ui/`. Each ships with a colocated `__tests__/<Primitive>.test.tsx`. Tests use `vitest` globals (config has `globals: true`), `@testing-library/react` 16.0.1, and a render-with-QueryClient wrapper mirroring `topbarWidgets.test.tsx` for primitives that read from stores (Toast).

Class composition uses `clsx` (new dep, ~250B) over template literals — easier to unit-test and harder to introduce duplicate utilities. Wave 1 adds `clsx` to `package.json` alongside the font packages.

The shared focus glow utility — applied to all primitives that take focus — is:

```ts
const focusGlow = 'focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)] focus:outline-none';
```

Co-locate this constant in `src/components/ui/focusGlow.ts` so it appears identically across primitives.

### 4.1 Button

**File:** `src/components/ui/Button.tsx` (+ `__tests__/Button.test.tsx`)

```ts
type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';
interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly leftIcon?: React.ReactNode;
  readonly rightIcon?: React.ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(...));
```

Internal composition: `clsx(variantClasses[variant], sizeClasses[size], loading && 'cursor-wait', className)`. `forwardRef` so RHF `<Button {...register}>` works (note: RHF doesn't actually need a ref on a Button, but `forwardRef` is the convention for headless primitives).

Primary variant: transparent bg, `border-borderJade`, `text-primary`. On hover, `bg-primary text-primary-fg shadow-glow-jade-md`. Ghost: `border border-primary/40 text-primary`, hover fills `bg-primary/10`. Danger: `border border-loss text-loss`, hover `bg-loss/10 shadow-glow-jade-md` (red-tinted glow from a new `shadow-glow-loss-md` utility added in Wave 1 — gated on `cyber-jade-tokens` glow restriction but allowed because the danger variant is chrome, not numeric data). Icon: square button, `p-2`, no label.

Size: `sm` (h-8 px-3 text-xs), `md` (h-10 px-4 text-sm), `lg` (h-12 px-6 text-base). All variants apply `font-display uppercase tracking-wider`.

Loading: `disabled={true}`, `aria-busy={true}`, replaces `leftIcon`/`rightIcon` with `<StatusDot color="jade" pulse aria-label="Cargando" />`. The `onClick` MUST NOT fire while `loading` is true — the test asserts `fireEvent.click` results in `onClick` not being called.

Test plan: 4 variants × 3 sizes = 12 visual states + loading state + disabled state + ref forwarding + aria attributes (`aria-busy`, `aria-disabled`).

### 4.2 Input / 4.3 Select / 4.4 Textarea

**Files:** `src/components/ui/{Input,Select,Textarea}.tsx` (+ tests).

Shared base component `src/components/ui/FieldShell.tsx` (label + error + hint chrome) — kept separate so each control owns its underlying `<input>`/`<select>`/`<textarea>` element while inheriting label/error/hint consistency.

```ts
interface BaseFieldProps {
  readonly label?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
}
```

The control-specific props (`InputHTMLAttributes<HTMLInputElement>`, etc.) extend `BaseFieldProps` and `forwardRef` so RHF `register('fieldName')` works. `aria-invalid` is derived from `error !== undefined`; `aria-describedby` references `${id}-error` / `${id}-hint` consistently.

Focus glow: `bg-input border border-borderJade rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)] focus:outline-none`.

`<Select>` renders a native `<select>` wrapped in a `<div>` for chevron styling — not a custom listbox (out of scope per spec line 121).

Test plan: RHF integration (mock `useForm` returning `{ register: vi.fn() }`), error rendering, hint rendering, focus-visible glow assertion, `aria-invalid` toggling, Enter-to-commit on `<Select>` (native behavior, asserted via `keyDown`).

### 4.5 Badge

**File:** `src/components/ui/Badge.tsx`.

```ts
type BadgeVariant = 'primary' | 'info' | 'profit' | 'loss' | 'warning' | 'neutral' | 'danger';
interface BadgeProps {
  readonly variant?: BadgeVariant;
  readonly children: React.ReactNode;
  readonly className?: string;
}
```

Variant map: solid bg at `/15` opacity, solid text color, `border-{variant}/40`. NO glow on `profit` / `loss` / `danger` (numeric-context rule). NO `font-mono` by default — caller can add via `className="font-mono"` for numeric badges (the spec's loss-badge example applies `font-mono` from the caller).

Test plan: 7 variants render with correct text color; click-out passthrough is NOT a Badge concern; data-testid attribute `data-variant={variant}` for row-level selectors.

Replaces 7 inline copies: `SubscriptionCard.tsx` (local `Badge` component, lines 136-147), `UserRow.tsx` (lines 43-50, 56-65), `PaymentRow.tsx` (lines 49-56), `TopPageRow.tsx`, `PlanRow.tsx`, `PlanHistoryRow.tsx`, plus the existing `TRADE_STATUS_BADGE` lookup consumed by `TradeStatusBadge.tsx`.

### 4.6 StatusDot

**File:** `src/components/ui/StatusDot.tsx`.

```ts
type StatusDotColor = 'jade' | 'cyan' | 'amber' | 'red';
interface StatusDotProps {
  readonly color?: StatusDotColor;
  readonly pulse?: boolean;
  readonly size?: 'sm' | 'md';
  readonly label?: string; // for screen readers
}
```

Implementation: a `<span>` with `inline-block w-2 h-2 rounded-full bg-{color}` + optional `animate-status-dot-pulse`. When `pulse={true}`, a halo `::before` pseudo-element renders at the color-tinted shadow ring (e.g. `shadow-[0_0_8px_rgba(0,255,157,0.6)]`) animated via the keyframe.

Reduced-motion: the global `prefers-reduced-motion` block in `index.css` collapses the animation; the halo stays static. No per-component check needed.

Test plan: pulse variant mounts with the keyframe class; aria-label passes through; color prop maps to correct bg class; reduced-motion media query is honored (jsdom doesn't render the animation, but the className is asserted).

### 4.7 DataTable

**File:** `src/components/ui/DataTable.tsx`.

```ts
interface Column<T> {
  readonly key: keyof T | string;
  readonly header: React.ReactNode;
  readonly cell?: (row: T) => React.ReactNode;
  readonly width?: string;
  readonly align?: 'left' | 'right' | 'center';
  readonly sortable?: boolean;
}
interface DataTableProps<T> {
  readonly columns: ReadonlyArray<Column<T>>;
  readonly rows: ReadonlyArray<T>;
  readonly rowKey: (row: T) => string;
  readonly loading?: boolean;
  readonly emptyState?: React.ReactNode;
  readonly skeletonRows?: number;
  readonly onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  readonly currentPage?: number;
  readonly pageSize?: number;
  readonly totalRows?: number;
  readonly onPageChange?: (page: number) => void;
  readonly className?: string;
}
export function DataTable<T>(props: DataTableProps<T>): JSX.Element;
```

Generic over `T` so `cell` accessors get type-safe row typing without runtime overhead.

Sticky header: `<thead>` wrapped in `sticky top-0 bg-surface/95 backdrop-blur-sm z-10`. Body row separator: `border-b border-white/[0.05]` (per spec — this is the `rgba(255,255,255,0.05)` value; the spec ties it to `cyber-jade-tokens` "white/[0.05]" opacity, NOT to a jade value).

Numeric cells: the consumer decides; `DataTable` does NOT auto-apply `font-mono` to columns (it would be wrong for text columns). The `cell` renderer is responsible for `font-mono` + `text-profit` / `text-loss` on numeric data. This is a documented contract in `docs/design-system.md`.

Loading state: renders `skeletonRows` placeholder rows (default 5) using `<Skeleton variant="text">`.
Empty state: `emptyState` prop or default `<EmptyState title="Sin datos" />`.
Sort: optional, client-side by default. When `onSort` is provided, clickable headers call it. Direction toggles `asc → desc → none`.
Pagination: parent-driven (TanStack Query consumers pass `currentPage`, `pageSize`, `totalRows`, `onPageChange` from their query hooks).

Test plan: sticky header renders with correct bg class; sort callback fires with correct args; row key uniqueness; numeric column does NOT auto-apply `font-mono`; empty/loading state.

Replaces 7 native `<table>` instances (TradeTable.tsx L67, AdminPlansPage.tsx L145, AdminAnalyticsPage.tsx L122, AdminPaymentsPage.tsx L121, AdminUsersPage.tsx L206, CuentasPage.tsx L235, pricing/ComparisonTable.tsx L16).

### 4.8 Tabs

**File:** `src/components/ui/Tabs.tsx`.

```ts
interface TabItem {
  readonly id: string;
  readonly label: React.ReactNode;
  readonly disabled?: boolean;
}
interface TabsProps {
  readonly items: ReadonlyArray<TabItem>;
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly ariaLabel?: string;
}
```

Active tab: `border-b-2 border-primary text-primary`. Inactive: `text-text-secondary hover:text-primary`. Keyboard: ArrowLeft/Right cycle, Home/End jump, Enter/Space commit.

The spec proposes URL persistence via `?tab=` query param — **deferred to consumer**. `Tabs` accepts controlled `value` + `onChange` only; the URL-persistence pattern (`useSearchParams`) lives in `CuentasDetailPage` and is a caller concern. The component does NOT ship its own URL hook.

Test plan: keyboard nav (ArrowLeft/Right with focus tracking), click-to-commit, disabled tab is non-focusable, ARIA `role="tablist"` + `aria-selected`.

### 4.9 EmptyState

**File:** `src/components/ui/EmptyState.tsx`.

```ts
interface EmptyStateProps {
  readonly icon?: React.ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
}
```

Layout: `flex flex-col items-center text-center py-12 px-4`. Icon dimmed to `text-text-muted`. Action rendered at `mt-4`. Default title color `text-text-primary`, description `text-text-secondary`.

Test plan: action slot renders below description; missing description omits the `<p>`; missing icon shows no icon element.

### 4.10 Skeleton

**File:** `src/components/ui/Skeleton.tsx`.

```ts
type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card';
interface SkeletonProps {
  readonly variant?: SkeletonVariant;
  readonly width?: string | number;
  readonly height?: string | number;
}
```

Animation: jade shimmer via `bg-[linear-gradient(90deg,rgba(0,255,157,0.04),rgba(0,255,157,0.16),rgba(0,255,157,0.04))] bg-[length:200%_100%] animate-shimmer-jade`. The `shimmer-jade` keyframe (added in Wave 1) sweeps `background-position: 0% 50% → 200% 50%` over 2s linear infinite. `prefers-reduced-motion` collapses it.

`aria-busy="true"` on the parent `<Skeleton>` wrapper — NOT on the consumer. Consumers should wrap multiple skeletons in `<div aria-busy="true">`.

Test plan: variant renders correct shape (rect via `rounded-md`, circle via `rounded-full`, text via `rounded h-4`, card via `rounded-2xl h-32`); width/height passthrough; `aria-busy` on root.

### 4.11 Toast

**Files:**
- `src/components/ui/Toast.tsx` (presentational)
- `src/components/ui/ToastContainer.tsx` (mount-once)
- `src/stores/useToastStore.ts` (Zustand slice)

```ts
type ToastSeverity = 'info' | 'success' | 'warning' | 'danger';
interface ToastItem {
  readonly id: string;
  readonly severity: ToastSeverity;
  readonly message: string;
  readonly durationMs?: number; // default 4000; danger 6000; success 3000
  readonly action?: { label: string; onClick: () => void };
}
interface ToastStore {
  readonly queue: ReadonlyArray<ToastItem>;
  push: (item: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}
```

Severity map: `info` → jade bg, `success` → profit bg, `warning` → warning bg, `danger` → loss bg. Each toast is a glassmorphic panel (`bg-surface/90 backdrop-blur-md border-borderJade`). Slides in from top-right via `translate-x-full → translate-x-0` over 200ms.

A11y: `aria-live="polite"` for `info`/`success`/`warning`, `aria-live="assertive"` for `danger`. Toast list rendered inside a single `<div role="region" aria-label="Notificaciones">`. Each toast is `role="alert"` for danger, `role="status"` otherwise.

Auto-dismiss: timer per toast, cleared on manual dismiss. ESC dismisses the focused toast.

`<ToastContainer>` mounts at `AppShell` root via `lazy` chunk. Wave 5 mounts it once for the entire app — both the public `AppShell` and the `PortalShell` consume it through a portal at `document.body`.

Test plan: `push` appends to queue; auto-dismiss fires `vi.useFakeTimers()` + `vi.advanceTimersByTime(4000)`; ESC handler removes focused; severity-specific `aria-live`.

### 4.12 PeriodoSplit (OPTIONAL — see §9.3)

The proposal flags this as conditional. **Decision: ship it as a primitive in Wave 4, but do NOT mount it in `<Topbar>` until a real consumer exists.** Rationale documented in §9.3.

## 5. Decorative system

### 5.1 DotGrid

**File:** `src/components/decor/DotGrid.tsx`.

```ts
interface DotGridProps {
  readonly spacing?: number;     // default 24
  readonly dotRadius?: number;   // default 1.5
  readonly opacity?: number;     // default 0.04
  readonly className?: string;
}
```

Implementation: inline `<svg>` with a `<defs><pattern id="dg" width={spacing} height={spacing} patternUnits="userSpaceOnUse"><circle cx={spacing/2} cy={spacing/2} r={dotRadius} fill="#00FF9D" fillOpacity={opacity} /></pattern></defs>` plus a `<rect width="100%" height="100%" fill="url(#dg)" />`. No `useEffect`, presentational only. The pattern id is generated per-render via `useId()` to avoid SVG id collisions when multiple DotGrids mount.

### 5.2 NeuralNetwork

**File:** `src/components/decor/NeuralNetwork.tsx`.

```ts
interface NeuralNetworkProps {
  readonly nodes?: number;     // default 12
  readonly density?: number;   // default 0.3
  readonly animate?: 'drift' | 'static'; // default 'drift'
  readonly className?: string;
}
```

Deterministic node placement via a seeded RNG (mulberry32 with a fixed seed = `0xC0FFEE`) so SSR/hydration and screenshot baselines stay stable. Edge count bounded per spec: `Math.round(nodes * (nodes-1) / 2 * density)`. Edges rendered as `<line>` with `stroke="#00FF9D" stroke-opacity="0.03"`.

When `animate="drift"` AND `prefers-reduced-motion` is NOT set, nodes translate ±4px via the `neural-drift` keyframe (12s ease-in-out infinite). Reduced-motion → `animate="static"` is forced regardless of the prop.

### 5.3 `statusDotPulse` keyframe

```ts
keyframes: {
  'status-dot-pulse': {
    '0%, 100%': { opacity: '0.5' },
    '50%':      { opacity: '1' },
  },
},
animation: {
  'status-dot-pulse': 'status-dot-pulse 1.5s ease-in-out infinite',
},
```

Color halo is rendered via `shadow-[0_0_8px_rgba(R,G,B,0.6)]` parameterized per `<StatusDot color>` variant.

## 6. Styleguide architecture

### 6.1 Route registration

In `src/router/config.tsx`, add (alongside the existing `/styleguide/glass` entry at L149):

```ts
const StyleguideJadePage = lazy(() =>
  import('../styleguide/JadeShowcase').then((m) => ({ default: m.StyleguideJadePage })),
);
// …
{ path: '/styleguide/jade', element: <StyleguideJadePage /> },
```

Auth gating per spec: redirect to `/login` if not authenticated AND `import.meta.env.PROD`. In dev (`import.meta.env.DEV`), the route is open. The existing `GlassShowcase` at `/styleguide/glass` stays public — additive change, no regression.

### 6.2 File structure

`src/styleguide/JadeShowcase.tsx` — section composition only. Each section delegated to a sub-component in the same file (single-file style to keep the route discoverable, mirroring `GlassShowcase.tsx`):

1. **Color tokens** — `<JadeColorSection />` — 8-token swatch grid (primary, primary.dk, primary.light, surface, bg, input, profit, loss, info, warning, text.primary, text.secondary). Each swatch shows hex + role.
2. **Typography** — `<JadeTypographySection />` — display stack (Orbitron → Rajdhani → Space Grotesk) + body + mono samples. Uses inline spans with `style={{ fontFamily: '... }}` so each sample renders with its native family even if `@fontsource` is unavailable.
3. **Glow + glass** — `<JadeGlowSection />` — primary button hover demo + glass card demo. Marked with `[data-glow-primary]`.
4. **Primitives** — `<JadePrimitivesSection />` — every primitive from §4 with state controls (variant dropdowns, size buttons, loading toggles).
5. **Decor** — `<JadeDecorSection />` — `<DotGrid>` + `<NeuralNetwork>` with live controls (opacity slider 0.01→0.10, node count 6→24). Section-level `useState`.
6. **Anti-patterns** — `<JadeAntiPatternsSection />` — 3 forbidden examples: numeric cell with glow (red strike), hardcoded `#00FF9D` (red strike), inline rgba string (red strike). Each rendered with `data-state="forbidden"` attribute.

Each `<section>` has `aria-labelledby` linking to its `<h2>`. The page is `darkMode: 'class'` locked — no toggle.

## 7. Migration sequencing — the seven waves

The proposal's 7 waves are binding. Each wave ships behind a revertable boundary. Per-wave commit structure follows `work-unit-commits`: tests + impl + spec reference in the same commit.

### Wave 1 — Fonts + tokens (≤400 LOC)

**Files:** `tailwind.config.ts`, `src/styles/index.css`, `src/main.tsx`, `package.json`

**Tasks:**
1. `pnpm add -D clsx @fontsource/rajdhani@5.1.0 @fontsource/space-grotesk@5.1.0`
2. Apply token hex pivots per §2.1 (replace primary ladder, bg, surface, input, profit/loss/info, text.*)
3. Add `borderJade` color token per §2.1
4. Add `statusDotPulse`, `neural-drift`, `shimmer-jade` keyframes per §2.5
5. Replace `::selection`, `:focus-visible`, `.auth-spinner`, `@keyframes pulse-cyan` (rename to `statusDotPulse`) in `index.css`
6. Wire `@fontsource/rajdhani/500.css` `600.css` `700.css` + `@fontsource/space-grotesk/400.css` `500.css` `700.css` in `main.tsx`
7. Update `fontFamily.display` stack per §3.3

**Verify:** `pnpm typecheck` + `pnpm lint` + visual diff of public landing + portal dashboard (Playwright screenshot baseline optional per proposal).

### Wave 2 — Config drift cleanup (≤400 LOC)

**Files:** `tailwind.config.ts`, `src/styles/index.css`

**Tasks:**
1. Replace cyan rgba values in `backgroundImage` (aurora-static, site-gradient, portal-selector)
2. Replace `glow-jade` / `glow-jade-sm` rgba values (currently `rgba(46,220,140,*)` → `rgba(0,255,157,*)`)
3. Remove the legacy `glow-cyan` / `glow-cyan-sm` aliases (the comment in L129 says they're slated for Wave 1c/1d removal — now)
4. Update `glow-primary` CSS class rgba value

**Verify:** `pnpm test` + visual spot-check of HomePage (hero uses `glow-primary`).

### Wave 3 — File drift cleanup (4 sub-PRs, each ≤400 LOC)

Group the 25 files by area. **Each sub-wave is a single chained PR.**

**3a — Layout (≤300 LOC):**
- `src/layout/AuroraBackground.tsx` (3 cyan rgba values, L158, L159, L166)
- `src/layout/TopNavMobileDrawer.tsx` (1 cyan shadow, L123)
- `src/layout/TopNav.tsx` (4 OLD-jade rgba → new jade rgba, L80, L89, L108, L130)
- `src/layout/Footer.tsx` (visual review for any inline rgba)

**3b — Components (≤400 LOC):**
- `src/components/portal/SidebarNav.tsx` (1 OLD-jade rgba → new jade rgba, L160)
- `src/components/portal/SidebarHeader.tsx` (1 OLD-jade rgba, L20)
- `src/components/portal/Modal.tsx` (1 OLD-jade rgba, L49)
- `src/components/portal/FundWithdrawModal.tsx` (1 cyan shadow, L123)
- `src/components/portal/DeleteAccountDialog.tsx` (visual review)
- `src/components/GlassCard.tsx` (1 cyan shadow, L20)
- `src/components/admin/AdminSidebar.tsx` (2 cyan shadows, L12 comment, L177)

**3c — Home/Pricing/Features (≤400 LOC):**
- `src/components/pricing/PricingTier.tsx` (4 cyan references, L48, L61, L96, L114)
- `src/components/pricing/ComparisonTable.tsx` (2 cyan strokes, L126, L145)
- `src/components/pricing/BillingCycleToggle.tsx` (1 cyan shadow, L58)
- `src/components/features/FeatureCard.tsx` (1 cyan stroke, L24)
- `src/components/home/{FeaturesGrid,DashboardPreview,Hero,CtaStrip,ContactTeaser,AboutTeaser,DashboardPreview}.tsx` (5+ OLD-jade rgba + 2 OLD-jade hex strokes)
- `src/features/subscription/UpgradeCard.tsx` (3 cyan references, L41, L76, L91)
- `src/components/about/MissionSection.tsx` (5 OLD-jade hex strokes, L50, L60, L61, L67, L75, L76)
- `src/components/consent/CookiesConsent.tsx` (1 cyan shadow, L84)

**3d — Pages/Auth/Admin (≤400 LOC):**
- `src/pages/PricingPage.tsx`, `RegisterPage.tsx`, `DashboardPage.tsx`, `UpgradePage.tsx`, `NotFoundPage.tsx`, `LoginPage.tsx`, `FeaturesPage.tsx`, `PaymentSuccessPage.tsx`
- `src/pages/admin/AdminPlansPage.tsx`, `AdminDashboardPage.tsx`, `AdminUsersPage.tsx`, `AdminPaymentsPage.tsx`, `AdminAnalyticsPage.tsx`
- `src/features/auth/PortalSelector.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`, `AdminRoute.tsx`, `AdminAuthGuard.tsx`
- `src/pages/portal/PlaybookPage.tsx`, `DiarioPage.tsx`, `CuentasPage.tsx`, `CuentasDetailPage.tsx`
- `src/components/admin/PlanRow.tsx`, `UserRow.tsx`, `PaymentRow.tsx`

**Verify per sub-wave:** `pnpm test` + visual smoke test of the affected pages (Playwright screenshot diff or manual review).

### Wave 4 — Primitives (11 commits, ≤400 LOC each)

Order: foundational first, composites second, peripheral last. Each commit ships the primitive + its colocated test + the `src/components/ui/index.ts` barrel export.

| Order | Primitive | LOC est. | Notes |
|---|---|---|---|
| 1 | `Button` | 130 | Includes forwardRef + loading + variants |
| 2 | `Input` | 110 | Includes FieldShell extraction |
| 3 | `Select` | 130 | Wraps native `<select>` |
| 4 | `Textarea` | 90 | |
| 5 | `Badge` | 70 | Replaces 7 inline copies |
| 6 | `StatusDot` | 70 | Includes halo shadow |
| 7 | `EmptyState` | 50 | |
| 8 | `Skeleton` | 90 | Includes shimmer |
| 9 | `Tabs` | 110 | ARIA tablist |
| 10 | `DataTable` | 280 | Generic, largest primitive |
| 11 | `Toast` + `ToastContainer` + `useToastStore` | 250 | 3 files |

Each commit's test file is the first artifact (RED). Implementation follows (GREEN). Refactor to remove duplication last. Coverage thresholds (80/75/80/80) MUST hold after each commit.

**Optional 12th commit:** `PeriodoSplit` primitive — see §9.3.

### Wave 5 — Migration (12 commits, ≤400 LOC each)

Order by lowest risk first (mechanical class replacements) → highest risk (DataTable with sort/pagination logic).

| Commit | Files | Migration |
|---|---|---|
| 5.1 | `SubscriptionCard.tsx` | Local `Badge` → `<Badge>` |
| 5.2 | `UserRow.tsx`, `PaymentRow.tsx`, `TopPageRow.tsx`, `PlanRow.tsx`, `PlanHistoryRow.tsx` | Inline badges → `<Badge>` |
| 5.3 | `TradeStatusBadge.tsx` | Maps to `<Badge variant={...}>` |
| 5.4 | `LoginForm.tsx`, `RegisterForm.tsx` | Inputs → `<Input>` |
| 5.5 | `NewTradeForm.tsx`, `CloseTradeModal.tsx`, `DeleteAccountDialog.tsx`, `FundWithdrawModal.tsx` | Inputs/Selects → primitives |
| 5.6 | `UpgradeCard.tsx`, `PlanRow.tsx`, `AdminPlansPage.tsx` | Buttons → `<Button variant="primary">` |
| 5.7 | `PricingTier.tsx`, `ComparisonTable.tsx`, `BillingCycleToggle.tsx`, `CtaStrip.tsx`, `ContactTeaser.tsx`, `Hero.tsx`, `PricingPage.tsx`, `RegisterPage.tsx`, `DashboardPage.tsx`, `UpgradePage.tsx`, `NotFoundPage.tsx`, `LoginPage.tsx`, `FeaturesPage.tsx`, `PaymentSuccessPage.tsx`, `Admin*.tsx` | Jade buttons + glow → `<Button>` |
| 5.8 | `CookiesConsent.tsx`, `TopNavMobileDrawer.tsx`, `AdminRoute.tsx`, `AdminAuthGuard.tsx` | Buttons → `<Button>` |
| 5.9 | `TopNav.tsx` (brand dot + Iniciar sesion + Cerrar sesion buttons) | `<Button variant="primary" size="sm">` + `<Button variant="ghost">` |
| 5.10 | `TradeTable.tsx` | Native `<table>` → `<DataTable>` |
| 5.11 | `AdminUsersPage.tsx`, `AdminPlansPage.tsx`, `AdminPaymentsPage.tsx`, `AdminAnalyticsPage.tsx` | Native tables → `<DataTable>` (preserve pagination hooks) |
| 5.12 | `CuentasPage.tsx`, `ComparisonTable.tsx` (the pricing version) | Native tables → `<DataTable>` |

Each commit must keep all existing tests green. The migration is mechanical for class strings; only the `ComparisonTable` (pricing) requires preserving the `data-testid` contract from `PaymentRow.test.tsx` (which renders a stub `<table>` wrapper).

### Wave 6 — Decorative + styleguide (3 commits, ≤400 LOC each)

| Commit | Files | Notes |
|---|---|---|
| 6.1 | `src/components/decor/DotGrid.tsx` + test | SVG pattern; no `useEffect` |
| 6.2 | `src/components/decor/NeuralNetwork.tsx` + test | Seeded RNG + reduced-motion guard |
| 6.3 | `src/styleguide/JadeShowcase.tsx` + route registration | Six required sections + dark-mode lock |

**Verify:** Navigate to `/styleguide/jade` manually (proposal says visual check). Manual smoke test for each section.

### Wave 7 — Enforcement + docs + stub pages (4 commits, ≤400 LOC each)

| Commit | Files | Notes |
|---|---|---|
| 7.1 | `eslint.config.js` + custom rule | `no-cyaan-literals` (note spelling per spec) as `warn` |
| 7.2 | `.stylelintrc.json` | `color-no-hex: true` for `.tsx` style blocks |
| 7.3 | CI grep guard + `docs/design-system.md` | `rg "rgba\(0,255,255|#00FFFF\|stroke=\"#00FFFF" src/` |
| 7.4 | `src/pages/portal/{Diario,Playbook,Configuracion}Page.tsx` + `SidebarNav.tsx` active-line verify + topbar polish | Re-skin stubs in Cyber-Jade |

**Open decision (sdd-tasks):** if PeriodoSplit is committed, mount it in `<Topbar>` between `RiskSemaphore` and `CommandPaletteTrigger`. If not, leave the slot empty (the spec mandates NO empty wrapper element).

## 8. Style enforcement

### 8.1 ESLint `no-cyaan-literals` rule

Add to `eslint.config.js` (flat config). Use `no-restricted-syntax` over a custom plugin — no plugin build pipeline, simpler rollout.

```js
{
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'warn',
      {
        selector: "Literal[value=/rgba\\(0,\\s*255,\\s*255|#00FFFF|pulse-cyan/]",
        message: 'Cyber-Jade spec: cyan literals are forbidden. Use rgba(0,255,157,*) for jade or a token.',
      },
      {
        selector: "TemplateElement[value.raw=/rgba\\(0,\\s*255,\\s*255|#00FFFF|pulse-cyan/]",
        message: 'Cyber-Jade spec: cyan literals are forbidden.',
      },
      {
        selector: "Literal[value=/stroke=\"#00FFFF\"/]",
        message: 'Cyber-Jade spec: cyan stroke is forbidden.',
      },
    ],
  },
},
```

Allow-list (skip these globs):
- `tailwind.config.ts`
- `docs/design-system.md`
- `openspec/changes/design-system-v1/specs/**`

**Contradiction to flag:** `pnpm lint` runs `eslint . --max-warnings 0`. A `warn`-severity rule will fail the build if any violation exists at lint time. Resolution: introduce a separate `pnpm lint:design` script that runs without `--max-warnings 0`, OR keep the rule at `warn` and run it ONLY in CI as a non-blocking check (the spec's "warn first, promote to error" lifecycle supports this). Recommended: split script.

### 8.2 Stylelint

```json
{
  "rules": {
    "color-no-hex": true,
    "declaration-property-value-disallowed-list": {
      "/^color/": ["/rgba\\(0,\\s*255,\\s*255/"],
    },
  },
  "ignoreFiles": [
    "src/components/ui/**",
    "src/components/decor/**",
    "tailwind.config.ts",
    "**/__tests__/**",
  ],
}
```

`src/components/ui/**` ignored because the primitive files may legitimately use inline rgba for the focus glow constant. `tailwind.config.ts` ignored because tokens are the source of truth.

### 8.3 CI grep guard

```bash
# .github/workflows/ci.yml (or equivalent) — fails build on match
! rg -l 'rgba\(0,\s*255,\s*255|#00FFFF|stroke="#00FFFF"|animate-pulse-cyan' \
  src/ \
  --glob '!tailwind.config.ts' \
  --glob '!**/__tests__/**'
```

This is the binary check from the spec (severity `error` for the guard; the lint rules stay `warn`).

### 8.4 `docs/design-system.md` outline

| Section | Content | Source spec |
|---|---|---|
| 1. Color | Hex + role table mirroring §2.1 | `cyber-jade-tokens`, `color-system` |
| 2. Typography | Display/body/mono usage rules | `cyber-jade-tokens` |
| 3. Glow + Glass | Where glow is allowed; chrome-only rule with numeric-data exception | `color-system`, `cyber-jade-tokens` |
| 4. Components | Recipe for Button, Input, Badge, StatusDot, DataTable | `primitive-library` |
| 5. Decor | When to use DotGrid vs NeuralNetwork | `decorative-system` |
| 6. Anti-patterns | 3+ forbidden examples with correct token fix | `style-enforcement` |

## 9. Risk-bound architectural decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Class composition | **`clsx`** over template literals | Easier to unit-test (`expect(button).toHaveClass('bg-primary')` over substring match); harder to introduce duplicate utilities |
| 2 | Primitives home | **`src/components/ui/`** not `src/components/common/` | `common/` already has glass-specific components (`GlassPanel`, `GlassCard`, `GlassModal`, `GlassDrawer`); `ui/` is the design-system chrome home |
| 3 | Toast state | **Separate `useToastStore`** Zustand slice | Keeps toast concerns out of `useSidebarCollapsed`, `useCommandPalette`, etc.; idiomatic per-store separation matches the existing Zustand pattern |
| 4 | DataTable generic | **`<DataTable<T>>`** with `Column<T>[]` | Type-safe column access via `cell: (row: T) => ReactNode` without runtime overhead |
| 5 | PeriodoSplit ship/no-ship | **Ship as primitive in Wave 4, mount in Wave 7 ONLY if a consumer exists** | Currently no global time-range use case; primitive alone is cheap, mount is the risk |
| 6 | Lint rule | **`no-restricted-syntax`** over a custom ESLint plugin | No plugin build pipeline; ship the simple rule first, promote to a plugin if rule complexity grows |
| 7 | Font loading | **`display: swap`** (default) | FOUT is preferable to FOIT for trading UI — user sees old font immediately, no invisible-text flash |
| 8 | `border-jade` token | **`borderJade` key, utility `border-borderJade`** (no plugin) | Tailwind 3 nested-key naming trap; alias via plugin adds a fork between ESLint rule and Tailwind class emit |
| 9 | Tabs URL persistence | **Consumer concern, not primitive** | Component stays controlled; `useSearchParams` lives in `CuentasDetailPage` (existing precedent) |
| 10 | DataTable numeric cells | **Caller applies `font-mono` + `text-profit`/`text-loss`** | Auto-applying would be wrong for text columns; documented contract enforces via review |
| 11 | Keyframe opacity range | **`0.5 → 1.0`** (not `0.6 → 1.0`) | Spec mandates `0.5 → 1.0` per `decorative-system`; old `pulse-cyan` was `0.6 → 1.0` — tighten perceived latency |
| 12 | ESLint `--max-warnings 0` | **Split script: `pnpm lint:design`** | `pnpm lint` fails on any warn; the design-system rule is `warn` per spec; separate script honors the lifecycle |

## 10. Open questions for sdd-tasks

1. **Per-wave task granularity** — recommendation: ≤1 day each, but Wave 3 needs further sub-wave split per the chained-PR rule (3a/3b/3c/3d already enumerated).
2. **Commit batching** — primitives ship one-per-commit per Wave 4. Toast is the only multi-file primitive (Toast + ToastContainer + useToastStore); ship as a single commit because the test imports all three.
3. **DataTable migration fidelity** — Wave 5.10-5.12 must preserve `data-testid` contracts (`trade-table`, `trade-table-loading`, `trade-table-empty`, `trade-table-error`). The existing tests in `src/features/trades/__tests__/` rely on these. Confirm whether new `data-testid` are acceptable (the spec doesn't say) — recommendation: keep old testids for backward compat.
4. **PeriodoSplit ship/no-ship** — final call: ship as primitive, do not mount in `<Topbar>` until DashboardPage consumes it. The spec reserves the slot; the optionality is in the mount, not the primitive.
5. **stylelint dependency** — adds a dev dep (~80MB). If the team rejects the dep, drop §8.2 and rely on ESLint + CI grep guard only. Confirm with the team in sdd-tasks.
6. **Reduced-motion media query** — currently global in `index.css` (L165-174). `<Skeleton>` and `<NeuralNetwork>` rely on it. Confirm no consumer overrides via Tailwind classes (`motion-safe:` / `motion-reduce:`).
7. **`PortalNav` archive** — already archived per `portal-fase0a-base` (L422-444 of `PortalNav.tsx`). No action needed in this change.
8. **`CuentasDetailPage` tabs** — currently uses inline tabs with `?tab=` query param. Wave 5 should NOT migrate those to `<Tabs>` (the URL persistence concern is consumer-specific). Decision: leave `CuentasDetailPage` tabs as-is; the `<Tabs>` primitive is available for future use.
9. **`TradeStatusBadge` → `<Badge>` migration** — the existing component imports `TRADE_STATUS_BADGE` from `types.ts` and applies its `className`. Migrating to `<Badge variant={...}>` requires changing the `TRADE_STATUS_BADGE` map to use variant keys instead of class strings. This is a 2-step change: update `types.ts` map + update `TradeStatusBadge.tsx`. sdd-tasks must NOT split this across commits.

## 11. Spec contradictions found

These need resolution before sdd-tasks begins, OR sdd-tasks must adapt the design to honor them.

### 11.1 ESLint `--max-warnings 0` vs `warn` severity

`pnpm lint` runs `eslint . --max-warnings 0`. A `warn`-severity rule that produces any match in `src/` will fail CI. The spec mandates `warn` for the design-system rule and `error` for the CI grep guard (different mechanisms). Resolution: split scripts (recommendation in §9.12). **Action for sdd-tasks:** confirm split-script approach OR change `pnpm lint` to drop `--max-warnings 0`.

### 11.2 `border-l-4 border-primary` vs existing `border-l-4 border-l-primary`

The `portal-shell` delta spec writes `border-l-4 border-primary`. The existing `SidebarNav.tsx` (L158-161) uses `border-l-4` + `border-l-primary` (border-left-color only). Using `border-primary` without `border-l-` would set all four borders to primary color — wrong. **Action:** the design honors the existing code pattern (`border-l-4 border-l-primary`); the spec wording is shorthand for "left border + primary color". No code change; clarification for sdd-tasks.

### 11.3 Wave 3 file count — 25 vs 30+

The proposal lists 25 files in Wave 3. The grep audit reveals cyan + OLD-jade rgba literals in 30+ files (additional: `TopNav.tsx`, `SidebarHeader.tsx`, `Modal.tsx`, `Hero.tsx`, `FeaturesGrid.tsx`, `CtaStrip.tsx`, `ContactTeaser.tsx`, `DashboardPreview.tsx`, `LoginPage.tsx`, `CuentasPage.tsx`, `CuentasDetailPage.tsx`, `FeaturesPage.tsx`, `NotFoundPage.tsx`, `MissionSection.tsx`, `DeleteAccountDialog.tsx`, `Footer.tsx`). **Action for sdd-tasks:** add a grep audit step at the start of Wave 3 to enumerate ALL files with OLD-jade rgba (`rgba(46,220,140,*)`) — the spec's CI grep guard catches cyan only. Consider extending the guard to catch OLD-jade rgba too (the hex pivot is incomplete without it).

### 11.4 `pricing/ComparisonTable.tsx` is a pricing component, not a data table

`src/components/pricing/ComparisonTable.tsx` is a feature-vs-feature grid (Starter / Plus / Elite columns), not a row-based data table. Replacing it with `<DataTable>` is semantically wrong. **Action:** Wave 5.12 should SKIP `ComparisonTable.tsx` — re-skin it manually (replace `stroke="#00FFFF"` with `text-primary` on the SVG checkmarks, leave the `<table>` as-is or convert to `<div>` grid). Flag for sdd-tasks.

### 11.5 `TradeTable.tsx` row component owns data formatting

`TradeTableRow.tsx` (3369 bytes) applies `font-mono`, `text-profit`/`text-loss`, badge rendering. The migration to `<DataTable>` requires `TradeTableRow` to become a cell-renderer map. The 11-column dense grid is non-trivial. **Action:** Wave 5.10 should be ≤2 sub-commits (table shell → row migration) to keep reviewable.

### 11.6 `AdminAuthGuard.tsx` cyan shadow

Line 82 has a cyan shadow that the proposal's 25-file list does NOT include. It's the auth loading state button. **Action:** add to Wave 3d (or flag as separate commit).

### 11.7 `border-jade` hyphen vs camelCase utility name

Spec calls the utility `border-jade` but Tailwind 3 can't emit flat hyphen keys (current `tailwind.config.ts` comment L36-43 documents this). Two options: (a) use `borderJade` key with `border-borderJade` utility, (b) ship a custom plugin to alias `border-jade` → `border-borderJade`. **Decision: (a)** per §9.8. **Action for sdd-tasks:** document the utility name as `border-borderJade` in `docs/design-system.md`.

---

## Summary envelope (per Section D of sdd-phase-common)

**Change:** `design-system-v1`
**Artifact:** `openspec/changes/design-system-v1/design.md` (~13 KB, ~30 sections / subsections)
**Approach:** 7-wave migration from existing jade (`#2EDC8C`) tokens + scattered cyan literals to a Cyber-Jade design system (`#00FF9D`) with 11 primitives, 2 decorative components, a `/styleguide/jade` route, and drift-prevention tooling.
**Key decisions:** 12 documented in §9 (clsx, `src/components/ui/` home, separate toast store, generic DataTable, `no-restricted-syntax` over plugin, font-display swap, `borderJade` token, Tabs as controlled-only, caller-driven numeric styling, tightened keyframe opacity, split lint script, primitive-only PeriodoSplit).
**Files affected:** 4 modified (tokens), ~30 modified (drift), 13 new primitives (src/components/ui/ + src/components/decor/ + src/styleguide/), 4 new tooling (eslint config, stylelint, CI grep, docs).
**Testing strategy:** vitest colocated per primitive (RED-first); migration commits must keep baseline 91 tests green; coverage thresholds 80/75/80/80 maintained; visual smoke test per wave via Playwright (optional).
**Open questions:** 9 in §10 — most critical: ship/no-ship PeriodoSplit mount, split `pnpm lint:design` script, extend CI grep guard to OLD-jade rgba.
**Spec contradictions:** 7 found in §11 — most critical: ESLint `--max-warnings 0` conflict, file-count undercount in Wave 3, `ComparisonTable` is not a data table, `border-jade` token naming trap.

**Next step:** Ready for `sdd-tasks`. Per-wave task breakdown + chained-PR slicing (especially Wave 3's 4 sub-waves) is the first deliverable.
