/*
 * portal-fase0a-base — tests for the persisted stores.
 *
 * sessionStorage round-trip is verified by stubbing it on the
 * `globalThis` object before each test and restoring afterwards.
 * For the "read on init" path we re-import the store module after
 * priming sessionStorage; Vitest caches modules so we force a fresh
 * import via `vi.resetModules()`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Storage = {
  readonly getItem: (k: string) => string | null;
  readonly setItem: (k: string, v: string) => void;
  readonly removeItem: (k: string) => void;
  readonly clear: () => void;
  readonly key: (i: number) => string | null;
  readonly length: number;
};

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
    clear: () => {
      data.clear();
    },
    key: (i) => Array.from(data.keys())[i] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
}

const STORAGE_KEY_COLLAPSED = 'jcs.portal.sidebar.collapsed';
const STORAGE_KEY_ACTIVE_WS = 'jcs.active.workspace_id';

let memoryStorage: Storage;
let originalSessionStorage: Storage | undefined;

beforeEach(() => {
  memoryStorage = createMemoryStorage();
  originalSessionStorage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
  (globalThis as { sessionStorage?: Storage }).sessionStorage = memoryStorage;
});

afterEach(() => {
  if (originalSessionStorage === undefined) {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  } else {
    (globalThis as { sessionStorage?: Storage }).sessionStorage = originalSessionStorage;
  }
  vi.resetModules();
});

describe('useSidebarCollapsed', () => {
  it('starts expanded (default false)', async () => {
    const { useSidebarCollapsed } = await import('../useSidebarCollapsed');
    expect(useSidebarCollapsed.getState().isCollapsed).toBe(false);
  });

  it('toggle() flips and persists to sessionStorage', async () => {
    const { useSidebarCollapsed } = await import('../useSidebarCollapsed');
    useSidebarCollapsed.getState().toggle();
    expect(useSidebarCollapsed.getState().isCollapsed).toBe(true);
    expect(memoryStorage.getItem(STORAGE_KEY_COLLAPSED)).toBe('1');
    useSidebarCollapsed.getState().toggle();
    expect(useSidebarCollapsed.getState().isCollapsed).toBe(false);
    expect(memoryStorage.getItem(STORAGE_KEY_COLLAPSED)).toBe('0');
  });

  it('set(true) persists "1"; set(false) persists "0"', async () => {
    const { useSidebarCollapsed } = await import('../useSidebarCollapsed');
    useSidebarCollapsed.getState().set(true);
    expect(memoryStorage.getItem(STORAGE_KEY_COLLAPSED)).toBe('1');
    useSidebarCollapsed.getState().set(false);
    expect(memoryStorage.getItem(STORAGE_KEY_COLLAPSED)).toBe('0');
  });

  it('reads back a previously-persisted "1" on the next module init', async () => {
    // Prime sessionStorage with the collapsed-flag, then re-import so
    // the module re-reads sessionStorage at construction time.
    memoryStorage.setItem(STORAGE_KEY_COLLAPSED, '1');
    const { useSidebarCollapsed } = await import('../useSidebarCollapsed');
    expect(useSidebarCollapsed.getState().isCollapsed).toBe(true);
  });
});

describe('useActiveWorkspace', () => {
  it('starts with null workspaceId', async () => {
    const { useActiveWorkspace } = await import('../useActiveWorkspace');
    expect(useActiveWorkspace.getState().workspaceId).toBeNull();
  });

  it('setWorkspaceId() persists to sessionStorage', async () => {
    const { useActiveWorkspace } = await import('../useActiveWorkspace');
    useActiveWorkspace.getState().setWorkspaceId('ws-abc-123');
    expect(memoryStorage.getItem(STORAGE_KEY_ACTIVE_WS)).toBe('ws-abc-123');
    expect(useActiveWorkspace.getState().workspaceId).toBe('ws-abc-123');
  });

  it('clear() removes from sessionStorage', async () => {
    const { useActiveWorkspace } = await import('../useActiveWorkspace');
    useActiveWorkspace.getState().setWorkspaceId('ws-1');
    useActiveWorkspace.getState().clear();
    expect(memoryStorage.getItem(STORAGE_KEY_ACTIVE_WS)).toBeNull();
    expect(useActiveWorkspace.getState().workspaceId).toBeNull();
  });

  it('reads back a previously-persisted id on the next module init', async () => {
    memoryStorage.setItem(STORAGE_KEY_ACTIVE_WS, 'ws-prev');
    const { useActiveWorkspace } = await import('../useActiveWorkspace');
    expect(useActiveWorkspace.getState().workspaceId).toBe('ws-prev');
  });
});
