#!/usr/bin/env bash
# verify-session-rename.sh — Slice C (T-020) gate.
#
# After Slices A + B of ``sessions-configurable-cap`` renamed the
# backend band literals ``EUROPA / NY_AMERICA / NY_PM`` to
# ``LONDON / NEW_YORK / SYDNEY``, no legacy literal should remain
# in production source files. This script enforces that with a
# simple grep + classifier.
#
# Exit codes:
#   0  → no legacy literal in production code.
#   1  → at least one production-code match (CI must FAIL).
#
# Allowed locations (do NOT cause a failure):
#   - ``.md`` files (rename-history documentation).
#   - Comment lines — docstrings, ``//``, ``#``, ``*`` (block
#     continuation), ``<!--`` HTML, ``"""`` / ``'''``.
#   - Test files (``__tests__/``, ``tests/``, ``*.test.*``,
#     ``*.spec.*``) — they assert the labels do NOT contain the
#     legacy literals as a regression guard.
#
# The script is invoked from the repo root and walks ``src/`` and
# ``backend/app/`` (production directories). Build artifacts and
# dependency trees are excluded by directory name.

set -uo pipefail

readonly LEGACY_PATTERN='EUROPA|NY_AMERICA|NY_PM'

# Extensions scanned. Includes .mjs / .cjs for completeness — the
# slice-rename was nominally JS/TS/Python only but the script
# intentionally mirrors the language set Slice A + B touched.
readonly EXTENSIONS=( ts tsx py js jsx mjs cjs )

# Directories to skip. Frontend build output and dependency
# trees dominate repo size; listing them by name keeps the find
# fast and the output deterministic.
readonly SKIP_DIRS=(
  node_modules dist coverage .playwright-mcp
  __pycache__ .venv venv test-results .git
  .pytest_cache .mypy_cache .ruff_cache .next out build
  .cache .playwright
)

# Build the find expression dynamically so the directory tree is
# walked exactly once. ``find -path '*/X/*'`` is the only supported
# way to exclude whole subtrees in GNU find.
find_args=( src backend/app -type f )
for d in "${SKIP_DIRS[@]}"; do
  find_args+=( -not -path "*/${d}/*" -not -path "*/${d}" )
done
find_args+=( \( )
first=1
for ext in "${EXTENSIONS[@]}"; do
  if [ "${first}" -eq 1 ]; then
    find_args+=( -name "*.${ext}" )
    first=0
  else
    find_args+=( -o -name "*.${ext}" )
  fi
done
find_args+=( \) -print0 )

# Collect ``<path>:<lineno>:<content>`` lines into a temp file.
# ``grep -n`` always emits this shape regardless of platform; we
# split it via bash parameter expansion so we never have to round-
# trip NUL through awk (awk's printf treats literal ``\0`` as the
# end of the C string and drops subsequent fields).
TMP_MATCHES="$(mktemp)"
trap 'rm -f "${TMP_MATCHES}"' EXIT

while IFS= read -r -d '' file; do
  grep -nE "${LEGACY_PATTERN}" "${file}" 2>/dev/null \
    | awk -v f="${file}" '{ printf "%s\x1f%s\n", f, $0 }' \
    >> "${TMP_MATCHES}" || true
done < <(find "${find_args[@]}" 2>/dev/null)

# Iterate ``<path>\x1f<grep-line>`` records. ASCII unit-separator
# (0x1F) is safe — it never appears in source code.
total=0
prod=0
test_files=0
comment=0
report=""

while IFS=$'\x1f' read -r file grep_line; do
  [ -z "${file}" ] && continue
  total=$((total + 1))

  # 1) Test files are allowed — they assert the labels do NOT
  # contain the literals as a regression guard. We do this check
  # first so a stray ``NOT.toHaveProperty('EUROPA')`` test never
  # trips the production rule.
  case "${file}" in
    *__tests__*|*/tests/*|*.test.*|*.spec.*)
      test_files=$((test_files + 1))
      continue
      ;;
  esac

  # 2) Comment-line detection. After ``filepath:lineno:`` the
  # remainder of the line is the source content. We trim leading
  # whitespace and look at the first non-blank character.
  # Matchers cover the comment dialects actually present in this
  # repo:
  #   - //, /* (JS/TS line + block)
  #   - # (Python/shell)
  #   - * at line start (continuation of /* ... */ block comments)
  #   - """ / ''' (Python module/class/function docstrings)
  #   - <!-- (HTML/JSX)
  content="${grep_line#${file}:}"
  content="${content#*:}"
  content="${content#"${content%%[![:space:]]*}"}"
  is_comment=0
  case "${content}" in
    "//"*) is_comment=1 ;;
    "/*"*) is_comment=1 ;;
    "#"*)  is_comment=1 ;;
    "*"*)  is_comment=1 ;;
    "\"\"\""*) is_comment=1 ;;
    "'''"*) is_comment=1 ;;
    "<!--"*) is_comment=1 ;;
  esac
  if [ "${is_comment}" -eq 1 ]; then
    comment=$((comment + 1))
    continue
  fi

  # 3) Production-code match — fail.
  prod=$((prod + 1))
  report+="${grep_line}"$'\n'
done < "${TMP_MATCHES}"

echo "verify-session-rename: ${total} match(es) across production + tests"
echo "  production-code matches: ${prod}    (must be 0)"
echo "  test-file matches:       ${test_files} (allowed — assertions)"
echo "  comment-line matches:    ${comment}   (allowed — rename-history)"

if [ "${prod}" -gt 0 ]; then
  echo "" >&2
  echo "FAIL: legacy session-band literals remain in production code:" >&2
  echo "${report}" >&2
  exit 1
fi

echo "OK: no legacy session-band literals in production code"
exit 0
