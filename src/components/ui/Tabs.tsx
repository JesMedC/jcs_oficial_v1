/*
 * design-system-v1 — Tabs primitive (Wave 4b, T4.9).
 *
 * Accessible tab navigation with keyboard support and optional URL
 * sync. Replaces the inline `<nav>` tab pattern in
 * `CuentasDetailPage.tsx` (4 tabs: Resumen, Saldo, Operaciones, Zona
 * de peligro). Wave 5 will migrate the consumer; this primitive is
 * the shared target.
 *
 * Composition (per orchestrator brief + design.md §4.8):
 *   - container: `<div>` with `border-b border-primary/20`
 *   - tablist: `<div role="tablist">` with horizontal flex
 *   - tab button: `<button role="tab">` with:
 *     - default: `px-4 py-2 text-text-secondary font-display
 *       uppercase tracking-wide text-sm border-b-2 border-transparent`
 *     - active: `text-primary border-primary` (jade underline per
 *       cyber-jade-tokens)
 *     - hover (inactive): `text-primary/70`
 *     - disabled: `opacity-50 cursor-not-allowed`
 *   - panel: `<div role="tabpanel">` rendering the active item's
 *     `panel`
 *
 * Behaviour:
 *   - controlled vs uncontrolled: prefer uncontrolled with
 *     `defaultActiveKey` when `activeKey` is not provided
 *   - URL sync: when `urlSyncKey` is set, read initial active from
 *     `?{urlSyncKey}=<key>`; on tab change call
 *     `history.replaceState` (NOT push) so we don't pollute the
 *     back/forward stack
 *   - keyboard nav: ArrowLeft/Right cycle, Home jumps to first,
 *     End jumps to last, Enter/Space activate the focused tab.
 *     Disabled tabs are skipped during keyboard navigation (they
 *     receive `disabled` so the browser itself skips them in the
 *     tab order, AND we manually skip them when computing the
 *     next/previous focus target).
 *
 * Accessibility:
 *   - `role="tablist"` on the container, `role="tab"` on each
 *     button, `role="tabpanel"` on the panel
 *   - `aria-selected` reflects active state
 *   - tab buttons expose `aria-controls={panelId}` and an `id`;
 *     the panel exposes `aria-labelledby={tabId}` and an `id`
 *     so screen readers can navigate the relationship
 *
 * Why no `clsx`: same Wave 1 read-only rule.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

export interface TabItem {
  readonly key: string;
  readonly label: ReactNode;
  readonly panel: ReactNode;
  readonly disabled?: boolean;
}

export interface TabsProps {
  readonly items: ReadonlyArray<TabItem>;
  readonly activeKey?: string;
  readonly defaultActiveKey?: string;
  readonly onChange?: (key: string) => void;
  readonly urlSyncKey?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

const TAB_BASE_CLASSES =
  'px-4 py-2 font-display uppercase tracking-wide text-sm border-b-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const TAB_ACTIVE_CLASSES = 'text-primary border-primary';
const TAB_INACTIVE_CLASSES =
  'text-text-secondary hover:text-primary/70';
const TAB_DISABLED_CLASSES = 'opacity-50 cursor-not-allowed';

/**
 * Read a query param from `window.location.search` without pulling in
 * `URLSearchParams` (the orchestrator's URL-sync brief is targeted at
 * the bare `?{urlSyncKey}=<key>` pattern; full query parsing lives
 * in the consumer's `useSearchParams` hook when it exists, e.g.
 * `CuentasDetailPage`).
 */
function readQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function writeQueryParam(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  // Per the brief: replaceState, not pushState, so each tab click
  // does not create a history entry.
  window.history.replaceState({}, '', url.toString());
}

export function Tabs({
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  urlSyncKey,
  ariaLabel,
  className,
}: TabsProps): JSX.Element {
  // Auto-generated id prefix for stable tab/panel id wiring across
  // re-renders (each Tabs instance gets its own namespace so two
  // Tabs on the same page don't collide).
  const reactId = useId();
  const idPrefix = `tabs-${reactId}`;

  // The "initial" active key is computed once per mount: prefer
  // URL > defaultActiveKey > first item. After mount, the
  // uncontrolled state takes over.
  const initialActive = useMemo<string>(() => {
    if (urlSyncKey !== undefined) {
      const fromUrl = readQueryParam(urlSyncKey);
      if (fromUrl !== null && items.some((i) => i.key === fromUrl)) {
        return fromUrl;
      }
    }
    if (defaultActiveKey !== undefined) return defaultActiveKey;
    return items[0]?.key ?? '';
  }, [urlSyncKey, defaultActiveKey, items]);

  // Track uncontrolled state. If activeKey is provided, we're in
  // controlled mode and this state is ignored.
  const [internalActive, setInternalActive] = useState<string>(initialActive);

  // Hold the tab buttons in refs so keyboard handlers can move focus.
  const tabRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const effectiveActive =
    activeKey !== undefined ? activeKey : internalActive;

  // URL sync on mount: if urlSyncKey is set and the URL does not yet
  // carry the param, write the initial active key to the URL so the
  // page refresh persists the tab selection.
  useEffect(() => {
    if (urlSyncKey === undefined) return;
    const fromUrl = readQueryParam(urlSyncKey);
    if (fromUrl === null && effectiveActive !== '') {
      writeQueryParam(urlSyncKey, effectiveActive);
    }
    // We intentionally only run on mount; subsequent URL writes
    // happen in `handleSelect` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledIndices = useMemo(
    () =>
      items
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.disabled !== true),
    [items],
  );

  const activeIdx = items.findIndex((i) => i.key === effectiveActive);

  const focusByOffset = (offset: number): void => {
    if (enabledIndices.length === 0) return;
    const currentEnabledPos = enabledIndices.findIndex(
      ({ idx }) => idx === activeIdx,
    );
    // If the active tab is disabled (shouldn't happen, but defensive),
    // start from -1 so the next computation lands on the first
    // enabled tab.
    const startPos = currentEnabledPos === -1 ? -1 : currentEnabledPos;
    const nextPos =
      (startPos + offset + enabledIndices.length) % enabledIndices.length;
    const target = enabledIndices[nextPos];
    if (target === undefined) return;
    const targetKey = items[target.idx]?.key;
    if (targetKey === undefined) return;
    tabRefs.current.get(targetKey)?.focus();
  };

  const focusFirst = (): void => {
    const first = enabledIndices[0];
    if (first === undefined) return;
    const key = items[first.idx]?.key;
    if (key === undefined) return;
    tabRefs.current.get(key)?.focus();
  };

  const focusLast = (): void => {
    const last = enabledIndices.at(-1);
    if (last === undefined) return;
    const key = items[last.idx]?.key;
    if (key === undefined) return;
    tabRefs.current.get(key)?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    key: string,
  ): void => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusByOffset(1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusByOffset(-1);
        break;
      case 'Home':
        event.preventDefault();
        focusFirst();
        break;
      case 'End':
        event.preventDefault();
        focusLast();
        break;
      case 'Enter':
      case ' ':
        // Activate the focused tab (browser button semantics already
        // commit on Enter/Space via the click handler; we just need
        // to make sure focus events don't double-trigger).
        event.preventDefault();
        handleSelect(key);
        break;
      default:
        break;
    }
  };

  const handleSelect = (key: string): void => {
    const item = items.find((i) => i.key === key);
    if (item === undefined || item.disabled === true) return;
    if (activeKey === undefined) {
      // uncontrolled: update internal state
      setInternalActive(key);
    }
    if (urlSyncKey !== undefined) {
      writeQueryParam(urlSyncKey, key);
    }
    if (onChange !== undefined) {
      onChange(key);
    }
  };

  const activeItem = items.find((i) => i.key === effectiveActive);
  const panelId = `${idPrefix}-panel`;
  const tabIdFor = (key: string): string => `${idPrefix}-tab-${key}`;

  const containerClasses = ['border-b border-primary/20', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        className="flex gap-1 overflow-x-auto"
      >
        {items.map((item) => {
          const isActive = item.key === effectiveActive;
          const tabId = tabIdFor(item.key);
          const classes = [
            TAB_BASE_CLASSES,
            isActive ? TAB_ACTIVE_CLASSES : TAB_INACTIVE_CLASSES,
            item.disabled === true ? TAB_DISABLED_CLASSES : null,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={item.key}
              ref={(el) => {
                tabRefs.current.set(item.key, el);
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled === true}
              data-tab-key={item.key}
              onClick={() => handleSelect(item.key)}
              onKeyDown={(e) => handleKeyDown(e, item.key)}
              className={classes}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        key={effectiveActive}
        id={panelId}
        role="tabpanel"
        aria-labelledby={
          activeItem !== undefined ? tabIdFor(activeItem.key) : undefined
        }
        tabIndex={0}
        className="mt-4 outline-none"
      >
        {activeItem?.panel ?? null}
      </div>
    </div>
  );
}
