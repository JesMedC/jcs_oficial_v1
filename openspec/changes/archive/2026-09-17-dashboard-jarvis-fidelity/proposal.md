# Proposal: dashboard-jarvis-fidelity — JARVIS HUD visual polish

> **Change**: `dashboard-jarvis-fidelity`
> **Project**: `jcs_oficial` (frontend SPA)
> **Mode**: openspec
> **Inspiration**: `/tmp/pi-clipboard-43991fa0-9d55-4b16-8359-905abb6978af.png` ("JADE CAPITAL SUITE — CORE INTERFACE")
> **Predecessor**: `core-interface-redesign` (merged — cyan tokens, `HudRing`, glass retune, dashboard skeleton)

## Why

`core-interface-redesign` flipped tokens to cyan + shipped the dashboard skeleton — but **20 fidelity gaps remain**: sessions are flat integers (rings exist but unused), sidebar is opaque black, brand text invisible, dashboard lacks the watermark chrome ("JADE CAPITAL SUITE · CORE INTERFACE"). Three pressures:

1. **Fidelity gap** — inspiration alignment was promised; current dashboard falls short. 12 HIGH/MEDIUM visual items broken/invisible.
2. **Reuse gap** — `HudRing` (Wave 6) ships unused; sessions ring, GENERAL double-ring, MES bars all reuse it.
3. **Drift gap** — `NeuralNetwork.tsx:94` + `DotGrid.tsx:73` still hardcode old jade `#00FF9D`; cyan page paints leftover jade in light mode.

## What Changes

20 items → 3 NEW spec files (`openspec/changes/dashboard-jarvis-fidelity/specs/<cap>/spec.md`):

### `dashboard-hud-fidelity` (items 1, 4, 7, 8, 15, 16)
| Item | File | Change |
|---|---|---|
| 1 | `WinrateBySessionCard.tsx:60-78` | `Tile` → `flex-row` + `<HudRing size="sm">` at right |
| 4 | `DashboardKPIsGrid.tsx` MES row | 5 stat cards → 2 stat + 3 `<HudProgressBar>` rows |
| 7 | `GeneralTile` | `md:col-span-2` + double-ring `<HudRing size="md">` |
| 8 | `DashboardSummaryStrip.tsx` | `SparklineIcon` from `rightAdornment` → card body |
| 15 | `DashboardSummaryStrip.tsx:111` | Balance tone: `>0` → `profit`, `=0` → `muted` (confirm) |
| 16 | `DashboardPage.tsx:171` | H1 `text-2xl md:text-3xl` → `text-3xl md:text-4xl` |

### `chrome-watermarks` (items 2, 3, 6, 13, 14, 18)
| Item | File | Change |
|---|---|---|
| 2 | `PortalSidebar.tsx:46` | `bg-[var(--color-bg)]` → `bg-surface/40 backdrop-blur-md border-[var(--glass-border)]` |
| 3 | `SidebarHeader.tsx:23` | `text-white` → `text-text-primary` + cyan textShadow |
| 6 | NEW `CoreInterfaceWatermark.tsx` | 3 absolute corners: top-left identity + 2× "JARVIS" (10% opacity, `pointer-events-none aria-hidden`) |
| 13 | `DashboardPage.tsx:190` `+ Nuevo trade` | solid → outlined (`border border-primary text-primary bg-transparent hover:bg-primary/10`) |
| 14 | `SidebarFooter.tsx:139` `Cerrar sesión` | drop `bg-primary/15` (match outlined) |
| 18 | `AccountSelector.tsx:93-95` | drop trailing `<span>{selectedLabel}</span>` caption |

### `decor-and-charts-fidelity` (items 5, 9, 10, 11, 12, 17, 19)
| Item | File | Change |
|---|---|---|
| 5 | `NeuralNetwork.tsx:94` + `DotGrid.tsx:73` | `DEFAULT_COLOR='#00FF9D'` → `'var(--color-jade)'` |
| 9 | `PerformanceCurveChart.tsx` + `CapitalCurveChart.tsx` | `absolute top-3 right-3` last-point badge |
| 10 | `PerformanceCurveChart.tsx` | `createSeriesMarkers()` for `capital_volume !== 0` (cyan ▲ / red ▼) |
| 11 | `curveChartTheme.ts:38-46` | hex → `var(--color-jade-profit)` / `var(--color-jade-info)` / cyan rgba |
| 12 | `RecentActivityFeed.tsx` | `formatHour(t.closed_at ?? t.opened_at)` → "HH:MM hrs" via Intl |
| 17 | `DashboardPage.tsx:158` `<DotGrid>` | `spacing={20} opacity={0.05}` |
| 19 | `RecentActivityFeed.tsx:121` | emoji flag → cyan circular chip `w-7 h-7 rounded-full bg-primary/15 border border-primary/30` |

## Out of scope

No new tokens; no cyan re-pivot; no `themes.css` cyan-ladder edits. No functional/UX changes (data flow + queries + store actions frozen). No new screens/routes/auth. No removal of `core-interface-redesign/` (historical). No chart-library swap (lightweight-charts stays; markers via its `createSeriesMarkers` API). No `data-testid` removal. No backend/API changes. No `it.todo` drift assertions forced live. No layout restructure beyond sidebar glass + right-rail MES swap.

## Risks

| Risk | Mitigation |
|---|---|
| Glow blowout on dense surfaces | Cap `<HudRing>`/`<HudProgressBar>` glow at 0.25 alpha; visual check Slice A |
| NeuralNetwork default-color drift on light mode | `DEFAULT_COLOR='var(--color-jade)'` auto-paints per theme |
| `createSeriesMarkers` re-creation cost | Cache `markersPluginRef`; `setMarkers` only when `points.length` changes |
| `<HudRing>` clip in narrow session tile | `size="sm"` (96px) fits ~140px tile on `md+` |
| `var()` in SVG `stroke`/`fill` browser compat | Visual review Slice C; fallback `getComputedStyle` if needed |

## Rollback Plan

Per-slice revert. Slice A touches only sidebar + watermark + CTA + decor primitives. Slice B touches only dashboard sub-components + chart layer. Each slice = single PR ≤ 400 LOC; `git revert <sha>` restores prior state.

## Dependencies

- `core-interface-redesign` (merged): cyan tokens, `HudRing`, glass + glow utilities
- `lightweight-charts` v5 `createSeriesMarkers` API (already installed)

## Success Criteria

- [ ] Sessions ring (`<HudRing size="sm">`); GENERAL double-ring (`md:col-span-2`, `size="md"`)
- [ ] MES row = 2 stat + 3 progress bars; sparkline in card body
- [ ] Sidebar glass; brand row visible (cyan textShadow)
- [ ] `<CoreInterfaceWatermark>` 3 corners (10% opacity, non-interactive)
- [ ] `+ Nuevo trade` + `Cerrar sesión` outlined; AccountSelector caption dropped
- [ ] Decor defaults → cyan CSS var (light-mode safe)
- [ ] Charts: last-point badge top-right + cyan/red triangular markers on capital volume
- [ ] `CURVE_THEME` hex → CSS vars; RecentActivityFeed "HH:MM hrs" + cyan chip avatar
- [ ] Dashboard `<DotGrid spacing={20} opacity={0.05}>`; H1 `text-3xl md:text-4xl`
- [ ] `pnpm test` green (baseline 795 maintained/grew); `pnpm lint` + `pnpm typecheck` + `pnpm build` clean
- [ ] No `Co-Authored-By` trailers; no `data-testid` removed

## Next Step

`sdd-spec` — materialize the 3 NEW spec files under `openspec/changes/dashboard-jarvis-fidelity/specs/<cap>/spec.md`.