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

## Slice 4: public conversion entry point
- [x] Redesigned home hero with responsive spacing, ambient motion, semantic CTAs, and reduced-motion support.
- [x] Added conversion-focused feature introduction and final CTA treatment.
- [x] Added `HomeConversion.test.tsx` with 2 passing tests.
- [x] Commit: `d26cd02 feat(public): improve conversion landing experience`.

## Slice 5: public page intros
- [x] Added shared `PublicPageIntro` for pricing, features, and about pages.
- [x] Added responsive spacing, eyebrow hierarchy, semantic tokens, and reduced-motion reveal.
- [x] Added focused intro test; public tests: 3 passed.
- [x] `pnpm typecheck` passed.
- [x] `pnpm lint` passed.
- [x] Added shared `AuthValuePanel` and applied it to login/register trust surfaces.
- [x] Added focused auth value panel test; 1 test passed.
- [x] `pnpm typecheck` passed.
- [x] `pnpm lint` passed.
- [ ] Authentication form internals remain for a later conversion slice.
- [ ] Implement user and admin page redesigns.
- [ ] Run full responsive/accessibility/build validation.
