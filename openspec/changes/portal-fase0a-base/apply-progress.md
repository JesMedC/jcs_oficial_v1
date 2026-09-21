# Apply Progress: portal-fase0a-base

## Waves completed
- [x] Wave 0: Foundation (zustand + cmdk + queryClient) — commit 2edc7a1
- [x] Wave 1a: Jade tokens — commit 7173917
- [x] Wave 1b: Jade primitives — commit 00a6c6f
- [x] Wave 1c: Jade public pages — commit 00cfc2e
- [x] Wave 1d: Jade portal pages — commit 1fcb3f3
- [x] Wave 1e: Jade forms + auth — commit 31bb6c0
- [x] Wave 2: Sidebar restore + Zustand + WorkspaceSelector — commit 624f500
- [x] Wave 3: GlassDrawer — commit f6d71e0
- [x] Wave 4: Topbar additions — commit 3e5ee04
- [x] Wave 5: NewTradeDrawer + useQuery migration — commit 20f0427
- [x] Wave 6: CommandPalette — commit dbd4d62

## Currently running
[None — all 11 waves completed]

## Failed waves
[None — every wave passed; no replays]

## Tests final
- Frontend: 128/128 (baseline 88 + 16 stores + 7 GlassDrawer + 4 topbar widgets + 3 CommandPalette + 4 CommandPalette/hotkey + 1 mutation + 2 accounts hooks + 3 portal-pages reworked = 128 passing)
- Backend: 103/103 (no changes; sanity check confirmed)
- Cyan-pivot preexistente tests fixed by Wave 2 (PortalNav archived, PortalShell wrapped with AuthProvider, PortalSidebar composed of three new sub-components)

## Notes
- 3 pre-existing tests at start were fixed by Wave 2 ("PORTAL" suite consolidated).
- 2 pre-existing typecheck errors remain unchanged: AdminAnalyticsPage Intl.NumberFormat overload (preexisting) and PaymentRow.test.tsx missing types (preexisting — module not present).
- Several `#00FFFF|\bcyan\b|glow-cyan` matches survive in out-of-scope files (AdminLayout comments, styleguide comment, UpgradeCard SVG stroke, StatsGrid comment, tailwind `pulse-cyan` keyframe alias). Documented as "issue lateral" in the consolidated report.
- Playwright E2E flows (sidebar collapse persist, drawer flow, palette Cmd+K) deferred to Final Verification — the user runs the manual smoke on `localhost:5173`.

## Issues laterales encontrados

1. **Cyan tokens not fully retired**: Several out-of-scope files still reference `#00FFFF`, `cyan`, or `glow-cyan`. They live outside the strict Waves 1a–1e file list (AdminLayout, styleguide, AdminAnalyticsPage, StatsGrid, UpgradeCard, Pulse-Cyan keyframe in tailwind.config.ts). The Wave 1a–1e task descriptions mark these as future cleanup but the design.md §4 says tokens retired means everything in `src/ tailwind.config.ts` returns zero matches. Pragmatically scoped to the file lists given.

2. **Pre-existing portal shell state from uncommitted changes**: At handoff there were pre-existing uncommitted modifications to PortalShell.tsx, PortalSidebar.tsx, and PortalShell.test.tsx (along with new untracked PortalNav.tsx + PortalNav.test.tsx). Wave 2 absorbed and restructured that work, but the `PortalNav.test.tsx` had pre-existing broken import paths (`../../features/auth/AuthProvider`) and was deleted along with the component it tested (archived).

3. **Accounts/Trades API mock surface**: Wave 5 expanded the test mocks (`listAccountsApi`, `getAccountById`, etc.) and used `mockImplementation` to handle the create-then-invalidate refetch path. The existing tests had been written against the old `useEffect+axios` shape.

4. **cmdk `ResizeObserver` dependency**: cmdk uses ResizeObserver which jsdom doesn't implement. Added a no-op stub in `src/test/setup.ts`. Doesn't affect runtime; test-time only.

5. **TanStack Query `'accounts'` invalidation timing**: The POST /accounts → invalidate pattern means the list auto-updates after a successful create. This required changing mockImplementation patterns in the existing tests because the original tests assumed `useEffect + axios`.

## Final state

```
git log --oneline | head -12
dbd4d62 feat(nav): CommandPalette with cmdk + global hotkey + tests
20f0427 feat(trades): NewTradeDrawer with RHF+Zod + useCreateTrade + useQuery migration
3e5ee04 feat(topbar): add RiskSemaphore placeholder + Cmd+K trigger + +Nuevo Trade button
f6d71e0 feat(common): GlassDrawer primitive with tests
624f500 feat(portal): restore vertical sidebar + archive PortalNav + 5 zustand stores + WorkspaceSelector
31bb6c0 feat(design): apply jade tokens to auth pages + forms
1fcb3f3 feat(design): apply jade tokens to portal pages
00cfc2e feat(design): apply jade tokens to public pages
00a6c6f feat(design): apply jade tokens to glass primitives
7173917 feat(design): pivot primary color tokens cyan -> jade (#2EDC8C)
2edc7a1 feat(frontend): add zustand + cmdk + tanstack queryclient foundation
fdf2e73 style(frontend): reduce h1/h2/button sizes (~12-25%)  ← predecessor
```
