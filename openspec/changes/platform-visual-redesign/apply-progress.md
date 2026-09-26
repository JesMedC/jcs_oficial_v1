# Apply progress: Platform-wide visual redesign

## Slice 1: semantic foundation
- [x] Added semantic token aliases in `src/styles/themes.css` while preserving legacy jade/JARVIS names.
- [x] Added shared motion utility classes and reduced-motion safeguards in `src/styles/index.css`.
- [x] `pnpm typecheck` passed.
- [x] `pnpm lint` passed.

## Slice 2: primitive normalization (partial)
- [x] Added semantic `SurfacePanel` primitive with default, elevated, outline, and interactive variants.
- [x] Added `MetricCard` primitive with semantic financial tones.
- [x] Added focused tests for both primitives.
- [x] Focused primitive tests: 2 passed.
- [x] `pnpm typecheck` passed.
- [x] `pnpm lint` passed.

## Pending
- [ ] Complete normalization of buttons, headers, badges, tables, and states.

## Slice 3: shell isolation
- [x] Public `AppShell` no longer renders marketing navigation/footer for `/admin/*`.
- [x] Admin shell uses semantic canvas/surface/border tokens and preserves responsive layout.
- [x] Portal and primitive regression tests: 13 passed.
- [x] `pnpm typecheck` passed.
- [x] `pnpm lint` passed.
- [ ] Isolate public/admin/user shells.
- [ ] Implement public conversion surfaces.
- [ ] Implement user and admin page redesigns.
- [ ] Run full responsive/accessibility/build validation.
