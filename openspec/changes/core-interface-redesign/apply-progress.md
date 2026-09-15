# Apply Progress: core-interface-redesign

**Change**: `core-interface-redesign`
**Phase**: sdd-apply (in progress)
**Started**: 2026-09-15

## Status

- **Slice 1** (token pivot): ✅ Complete
- **Slice 2** (dashboard density): ⏳ Pending
- **Slice 3** (shell chrome): ⏳ Pending
- **Slice 4** (per-page migration): ⏳ Pending
- **Slice 5** (drift guard + light audit): ⏳ Pending

## Slice 1 — Token pivot

**Commits**
- `7335e4f` — `feat(core-interface-redesign): slice 1 — cyan token pivot`

**Tasks**
- **T-024** ✅ Cyan ladder in `src/styles/themes.css`
  - RED: created `src/test/themes.test.ts` with 26 cases asserting cyan hex in dark + light modes, profit/loss separation, border + HUD decor rgba, and a jade-drift guard. Verified RED with 17 failed / 9 passed.
  - GREEN: replaced `themes.css` dark + light blocks. Verified GREEN: 26/26 passed.
  - TRIANGULATE: profit shift `#35D07F → #3CE0B8`, loss shift `#FF2A55 → #FF3D5F`, light-mode cyan `#00838F` (WCAG AA on `#F5FBFD`), profit light `#1F8A8A`. All assertions explicit.
  - REFACTOR: updated top file comment to document the cyan pivot history.
- **T-025** ✅ Glow + glass alpha retune in `tailwind.config.ts`
  - RED: rewrote `src/test/tailwind.config.test.ts` with cyan contract assertions (`glow-jade` alpha `0.25`, `glow-jade-sm` alpha `0.16`, `glow-cyan` alias, all decorative rgba cyan). Verified RED with 7 failed / 8 passed.
  - GREEN: rewrote `tailwind.config.ts` end-to-end with cyan rgba throughout (`glow-jade`, `glow-jade-sm`, new `glow-cyan`, `aurora-static`, `site-gradient`, `portal-selector`, `auth-pulse` halo). Verified GREEN: 15/15 passed.
  - TRIANGULATE: explicit "no legacy jade" guards in every background-image test (`not.toContain('0,255,157')`, `not.toContain('0,255,255')`).
  - REFACTOR: updated top comment + boxShadow comment to reflect the cyan pivot history.

**Verification gates**
- `pnpm test` → 827/827 (was 801; +26 new themes tests). ✅
- `pnpm typecheck` → clean. ✅
- `pnpm lint` → clean (no warnings; passes `--max-warnings 0`). ✅
- `pnpm build` → succeeded in 2.95s. ✅

**Edit surface**
- `src/styles/themes.css` (replaced end-to-end; cyan ladder + light variant + HUD decor rgba + shadows)
- `tailwind.config.ts` (replaced end-to-end; cyan rgba throughout, new `glow-cyan` alias, updated comments)
- `src/test/themes.test.ts` (new; 26 cases)
- `src/test/tailwind.config.test.ts` (replaced end-to-end; cyan contract)

**Risks encountered (mitigated)**
- The existing `tailwind.config.test.ts` pinned jade rgba values that would have broken silently under the cyan pivot. Mitigation: updated the contract tests as part of T-025 RED so the cyan contract is the new source of truth.
- Initial `edit` tool refused the multi-line tailwind.config.ts replacement (whitespace matching). Mitigation: rewrote the file end-to-end via `write`.

**Out-of-scope actions taken** (none)
- No consumer file touched — all 121+ components repaint via the CSS-var indirection.
- No backend touched.
- No archived change touched (`design-system-v1`, `sessions-configurable-cap`).

**Review risk**
- LOW. Single commit, 346 lines net, all reversible via `git revert 7335e4f`.
- Visual review recommended before Slice 2 lands: spin up `pnpm dev` and confirm the cyan accent reads correctly on Dashboard + Topbar + the `+Nuevo Trade` CTA. If cyan reads too bright or halo blowout is visible, retune `glow-jade` alpha (`0.25 → 0.22`) before Slice 2.

## Slice 2 — Dashboard density

⏳ Pending (will land after user review of Slice 1 + visual sign-off on cyan)
