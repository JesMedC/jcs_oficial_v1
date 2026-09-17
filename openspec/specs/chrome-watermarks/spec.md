# Spec: chrome-watermarks (NEW)

**Change**: `dashboard-jarvis-fidelity`
**Domain**: chrome-watermarks
**Status**: new spec

## Purpose

Apply JARVIS HUD-style chrome polish to the portal shell + dashboard header: turn the opaque sidebar into glass, make the sidebar brand row visible against the dark background, add the "JADE CAPITAL SUITE · CORE INTERFACE" watermark chrome to the dashboard corners, and switch the two cyan CTA pills (`+ Nuevo trade`, `Cerrar sesión`) from solid-fill to outlined style. Reuses existing glass + cyan tokens; no new tokens.

## Requirements

### REQ-CWM-001 — Sidebar glass surface (MUST)
`PortalSidebar.tsx` line 46 MUST replace `bg-[var(--color-bg)]` with `bg-surface/40 backdrop-blur-md border-r border-[var(--glass-border)]`. The width transition (`w-16 ↔ w-72`), collapse behavior, and `<Scanline>` overlay MUST remain unchanged.

#### Scenario: Sidebar shows glass on desktop
- GIVEN viewport width ≥ 1024px and sidebar expanded
- WHEN `PortalSidebar` renders
- THEN the `<aside>` MUST apply `bg-surface/40` + `backdrop-blur-md`
- AND the right border MUST use `var(--glass-border)`

#### Scenario: Scanline still mounts
- GIVEN the sidebar renders
- WHEN the chrome is initialized
- THEN `<Scanline duration={6}>` MUST remain mounted as last child

### REQ-CWM-002 — Sidebar brand row visible (MUST)
`SidebarHeader.tsx` line 23 MUST replace `text-white` with `text-text-primary` and add cyan `textShadow` via inline `style={{ textShadow: '0 0 8px rgba(0,212,216,0.35)' }}`. The "USUARIO" sublabel MUST remain `text-text-muted`.

#### Scenario: Brand row contrasts against glass
- GIVEN the sidebar renders expanded
- WHEN `SidebarHeader` mounts
- THEN the brand `<span>` MUST use `text-text-primary` class
- AND the inline `textShadow` MUST equal `0 0 8px rgba(0,212,216,0.35)`
- AND the sub-label MUST remain `text-text-muted`

### REQ-CWM-003 — Core interface watermark chrome (MUST)
A new `<CoreInterfaceWatermark>` component (mounted inside `DashboardPage.tsx` at the same absolute-positioned chrome layer as `<DotGrid>` + `<NeuralNetwork>`) MUST render three absolutely-positioned `<span>` watermarks:
- Top-left: `JADE CAPITAL SUITE · CORE INTERFACE`
- Bottom-left: `JARVIS`
- Bottom-right: `JARVIS`

All three MUST use `font-display uppercase tracking-widest text-[10px] text-text-muted opacity-10 pointer-events-none aria-hidden`. They MUST sit above the decor layer but below the dashboard content (z-0 inside the chrome layer).

#### Scenario: Watermark renders 3 spans
- GIVEN the dashboard renders
- WHEN `<CoreInterfaceWatermark>` mounts
- THEN it MUST contain 3 child `<span>` elements
- AND the first MUST start with `JADE CAPITAL SUITE`
- AND the second + third MUST equal `JARVIS`

#### Scenario: Watermark does not block clicks
- GIVEN the watermark renders
- WHEN a user attempts to click on a watermark span
- THEN `pointer-events: none` MUST prevent the click from being intercepted

### REQ-CWM-004 — `+ Nuevo trade` outlined pill (MUST)
The `+ Nuevo trade` CTA button on `DashboardPage.tsx` lines 186-193 MUST switch from solid (`bg-primary text-bg`) to outlined (`border border-primary text-primary bg-transparent hover:bg-primary/10`). The `hover:shadow-glow-cyan` MUST remain.

#### Scenario: Outlined CTA renders border
- GIVEN the dashboard renders
- WHEN the CTA mounts
- THEN its className MUST include `border border-primary text-primary bg-transparent`
- AND the hover state MUST add `bg-primary/10`

### REQ-CWM-005 — `Cerrar sesión` ghost pill (MUST)
The `Cerrar sesión` button on `SidebarFooter.tsx` line 139 MUST drop its `bg-primary/15` fill and switch to the outlined style (`btn-cyber-jade` already applies the outline — only the fill class needs removal). The button MUST keep its logout icon and behavior unchanged.

#### Scenario: Logout button is outlined
- GIVEN the sidebar footer renders expanded
- WHEN `SidebarFooter` mounts
- THEN the logout button MUST NOT contain `bg-primary/15`
- AND clicking it MUST still trigger `handleLogout`

### REQ-CWM-006 — AccountSelector drops trailing caption (MUST)
`AccountSelector.tsx` lines 93-95 MUST remove the trailing `<span className="font-mono text-[11px] text-text-muted">{selectedLabel}</span>` (the selected-label mirror). The `<select>` input's selected `<option>` already conveys the value; the trailing caption is redundant.

#### Scenario: AccountSelector has no caption
- GIVEN the dashboard renders with ≥ 1 active account
- WHEN `AccountSelector` mounts
- THEN it MUST contain exactly ONE `<select>` element
- AND it MUST NOT contain a sibling `<span>` rendering the same label

## Dependencies

- `glass-border` CSS var (existing, defined in `themes.css`)
- `--color-jade` + `--color-jade-glow` tokens (existing)
- `text-text-primary` + `text-text-muted` tokens (existing)
- `glow-cyan` Tailwind utility (existing, alias of `glow-jade` from `core-interface-redesign` Slice 1)

## Out of scope

- Sidebar widening (`w-64` → `w-72` from `core-interface-redesign` — already shipped)
- Language selector (covered by `topbar` spec)
- Topbar mount-order changes (frozen)
- Marketing page chrome (`/`, `/pricing`, etc.)
- `<CoreInterfaceWatermark>` on pages other than the dashboard