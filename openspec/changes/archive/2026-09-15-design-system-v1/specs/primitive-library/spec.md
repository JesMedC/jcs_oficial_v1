# Spec: primitive-library

## Purpose

Define the behavioral contracts for the 11 UI primitives shipped in `src/components/ui/` during `design-system-v1`. Every primitive MUST be dark-mode-only, accessible (WCAG 2.1 AA keyboard + screen-reader), and carry a colocated `.test.tsx` file. This spec is what future sdd-apply will validate against.

Primitives cover chrome — they do not own data fetching or business logic.

## Requirements

### Requirement: Button

The `<Button>` SHALL accept `variant: 'primary' | 'ghost' | 'danger' | 'icon'`, `size: 'sm' | 'md' | 'lg'`, and `state: 'default' | 'hover' | 'active' | 'disabled' | 'loading'`. Primary MUST render transparent bg with `border-jade` (1px jade border) and `text-primary`; on hover the background MUST fill `bg-primary` and text becomes `text-primary-fg`. Display font SHALL apply with `uppercase tracking-wider`. Loading state SHALL replace the label with a jade `<StatusDot>` and disable click events.

#### Scenario: Primary hover fill
- GIVEN a `<Button variant="primary">Aceptar</Button>`
- WHEN hovered
- THEN the background MUST equal `bg-primary` and the text MUST equal `text-primary-fg`

#### Scenario: Loading disables click
- GIVEN a loading button
- WHEN clicked
- THEN the `onClick` handler MUST NOT fire

### Requirement: Input, Select, Textarea

`<Input>`, `<Select>`, and `<Textarea>` SHALL render with `bg-input` (`#0A1017`), `border-jade` on focus, and `shadow-glow-jade-sm` on focus ring. Each MUST forward `aria-invalid`, `aria-describedby`, and `aria-label` to the underlying element. Keyboard navigation MUST follow platform conventions (Tab/Shift+Tab order, Enter to commit on Select).

#### Scenario: Focus shows glow
- GIVEN an `<Input>` with `aria-label="email"`
- WHEN focused via keyboard
- THEN a jade glow MUST appear via `box-shadow: 0 0 5px rgba(0,255,157,0.5)`

#### Scenario: Invalid input announces
- GIVEN an `<Input aria-invalid="true" aria-describedby="email-err">`
- WHEN a screen reader inspects the control
- THEN it MUST announce both `invalid` state and the linked error description

### Requirement: Badge

`<Badge>` SHALL accept `variant: 'primary' | 'info' | 'profit' | 'loss' | 'neutral'`. Each variant SHALL map to its semantic color from `cyber-jade-tokens`. Badges MUST NOT apply glow to their numeric content.

#### Scenario: Loss badge is solid
- GIVEN `<Badge variant="loss">-2.4%</Badge>`
- WHEN rendered
- THEN the text MUST be solid `text-loss` with `font-mono` and no glow

### Requirement: StatusDot

`<StatusDot>` SHALL accept `color: 'jade' | 'cyan' | 'red' | 'amber'` and `pulse: boolean`. When `pulse` is `true`, the dot MUST animate via the `statusDotPulse` keyframe (see `decorative-system`).

#### Scenario: Pulsing jade dot
- GIVEN `<StatusDot color="jade" pulse />`
- WHEN rendered
- THEN the dot MUST animate opacity 0.5 → 1.0 with the documented timing

### Requirement: DataTable

`<DataTable>` SHALL accept `columns: Column[]` where each column defines `key`, `header`, `width?`, `align?`, `cell` (renderer or `value` accessor), and optional `sortable`. The table SHALL render a sticky `<thead>` with `bg-surface/95`, body rows separated by `1px solid rgba(255,255,255,0.05)`, optional selection checkboxes (left column), and configurable pagination hooks. Numeric cells MUST render with `font-mono` and MUST NOT receive glow utilities.

#### Scenario: Sticky header on scroll
- GIVEN a `<DataTable>` with 50 rows
- WHEN the user scrolls inside the table viewport
- THEN the `<thead>` MUST remain pinned to the top

#### Scenario: Sort toggles direction
- GIVEN a sortable column
- WHEN its header is clicked
- THEN the table MUST call `onSort(columnKey, direction)` and re-render with the new order

### Requirement: Tabs / TabBar

`<Tabs>` SHALL accept `items: { id, label }[]` and `value` + `onChange`. The active tab MUST render with a jade 2px underline (`border-b-2 border-primary`) and `text-primary`. Inactive tabs MUST use `text-text-secondary`.

#### Scenario: Active tab underline
- GIVEN `<Tabs value="open" items={[{id:'open',label:'Abiertos'},{id:'closed',label:'Cerrados'}]}>`
- WHEN rendered
- THEN the "Abiertos" tab MUST show the jade underline and `text-primary`

### Requirement: EmptyState

`<EmptyState>` SHALL accept `icon?: ReactNode`, `title`, `description?`, and `action?: ReactNode`. It MUST center content, render `text-text-secondary` for the description, and render the `action` slot at the bottom (typically a primary `<Button>`).

#### Scenario: Renders action slot
- GIVEN `<EmptyState title="Sin trades" action={<Button>Crear</Button>} />`
- WHEN rendered
- THEN the button MUST appear below the description with `mt-4`

### Requirement: Skeleton

`<Skeleton>` SHALL accept `width?`, `height?`, and `variant: 'rect' | 'text' | 'circle'`. It MUST render a jade-shimmer animation (`linear-gradient` sweep at low opacity). The component MUST be `aria-busy="true"` when used inside a loading region.

#### Scenario: Text skeleton width
- GIVEN `<Skeleton variant="text" width="60%" />`
- WHEN rendered
- THEN it MUST occupy 60% of its parent width and animate the jade shimmer

### Requirement: Toast

`<Toast>` SHALL be rendered by a `<ToastViewport>` mounted at the app root, fed by a `useToastStore` Zustand slice. The store MUST hold `queue: ToastItem[]` and expose `push(item)`, `dismiss(id)`. Severity variants: `info` / `success` / `warning` / `danger`. Toasts MUST slide in from top-right, auto-dismiss after 4s (configurable per item), and stack vertically with 8px spacing. Each toast MUST be keyboard-dismissible (Escape).

#### Scenario: Push appends and auto-dismisses
- GIVEN a `useToastStore` with empty queue
- WHEN `push({severity:'info', message:'Guardado'})` is called
- THEN the queue MUST contain one item and MUST clear after 4s

#### Scenario: Escape dismisses focused toast
- GIVEN a visible toast with focus
- WHEN the user presses Escape
- THEN that toast MUST be removed from the queue immediately

## Dependencies

- `cyber-jade-tokens`
- `zustand-stores` (for `useToastStore`)
- All primitives colocated with `src/components/ui/*.test.tsx`

## Out of scope

- Data fetching, query hooks, or business logic inside primitives.
- Light theme variants.
- Drag-and-drop or virtualized table rows (deferred).
