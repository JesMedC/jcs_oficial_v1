<!--
  Pull Request template for jcs_oficial_v1.

  Conventions enforced here:
  - Linked issue (Closes/Fixes/Resolves #N) when one exists.
  - Exactly one type:* label after opening (type:bug, type:feature,
    type:refactor, type:docs, type:chore, type:breaking-change).
  - Conventional commit format on every commit (feat/fix/style/...: ...).
  - No Co-Authored-By trailers.
  - File-level table that maps behavior change to the touched file.
  - Test plan with the exact commands and the observed results.

  Sections marked optional can be deleted if empty. Keep the headings
  even when empty so the rendered PR description has consistent shape
  across PRs (the rendered description is what reviewers scan first,
  not the template diff).
-->

## Linked issue

<!-- Required when an issue exists. Delete this block if the PR is
     housekeeping with no issue. Use one of:
     Closes #N | Fixes #N | Resolves #N
     Skip this block only when there is no upstream issue to close. -->

## Summary

<!-- 1-3 bullets. What does this PR do and why. Read this block first
     to decide whether the rest is worth reading. -->

-

## Type of change

<!-- Pick exactly ONE and the matching label must be applied after
     opening. Delete the others. -->

- [ ] Bug fix (`type:bug`)
- [ ] New feature (`type:feature`)
- [ ] Documentation only (`type:docs`)
- [ ] Code refactoring (`type:refactor`)
- [ ] Maintenance / tooling (`type:chore`)
- [ ] Breaking change (`type:breaking-change`)

## Changes

<!-- File-level table. One row per file or per logical group. Keep
     the rows short — the diff is the source of truth, this table
     is the index. -->

| File | Change |
|---|---|
| `path/to/file.ts` | one-line summary |
| `path/to/other.tsx` | one-line summary |

## Test plan

<!-- Replace each checkbox with the exact command you ran and the
     observed result. A reviewer should be able to reproduce the
     verification by copy-pasting these. -->

- [ ] `pnpm exec vitest run <touched files>` — observed:
- [ ] `pnpm typecheck` — observed:
- [ ] `pnpm exec eslint --max-warnings 0 <touched files>` — observed:
- [ ] Full suite `pnpm exec vitest run` — observed:
- [ ] Manual browser verification (desktop + 390x844 mobile if UI changed) — observed:

## Out of scope (gaps tracked separately)

<!-- List anything you discovered during the change but did NOT
     address. Surfaces real bugs without expanding the PR scope.
     Format: file:line — short description. -->

-

## Backout / rollback

<!-- One sentence on how to revert this PR safely. For schema or
     discipline changes, name the exact file and commit to revert. -->

Revert this PR's merge commit; no DB schema or migration touched.

## Checklist

- [ ] Linked an issue (or explicitly justified no-issue housekeeping)
- [ ] Exactly one `type:*` label applied after opening
- [ ] Conventional commit format on every commit
- [ ] No `Co-Authored-By` trailers
- [ ] Self-review diff against the target branch
- [ ] Tests added for new behavior; existing tests still pass
- [ ] `pnpm typecheck` and `pnpm lint` clean
- [ ] `odd/tasks/<feature>.md` updated if behavior changed
