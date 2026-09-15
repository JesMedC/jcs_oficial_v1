/*
 * design-system-v1 (Wave 5) — Theme store tests.
 *
 * Cubre el contrato del store: persisted init, toggle, set explícito,
 * resetToSystem. Cada test corre con localStorage y matchMedia stub
 * para que sea determinístico sin importar el ambiente del runner.
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

const STORAGE_KEY = 'jcs.theme.mode';

let memoryStorage: Storage;
let originalLocalStorage: Storage | undefined;
let originalMatchMedia: typeof window.matchMedia | undefined;

beforeEach(() => {
  memoryStorage = createMemoryStorage();
  originalLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage;
  originalMatchMedia = window.matchMedia;
  // Default: matchMedia says no-preference (dark).
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  // Re-import the store fresh (vitest caches modules by default).
  vi.resetModules();
});

afterEach(() => {
  if (originalLocalStorage !== undefined) {
    (globalThis as { localStorage: Storage }).localStorage = originalLocalStorage;
  }
  if (originalMatchMedia) window.matchMedia = originalMatchMedia;
  vi.resetModules();
});

describe('useThemeStore', () => {
  it('defaults to dark when no stored value and system prefers dark', async () => {
    const { useThemeStore } = await import('../useThemeStore');
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().initialized).toBe(false);
  });

  it('respects prefers-color-scheme=light on first load', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('light'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.resetModules();
    const { useThemeStore } = await import('../useThemeStore');
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('reads persisted mode from localStorage on init', async () => {
    memoryStorage.setItem(STORAGE_KEY, 'light');
    const { useThemeStore } = await import('../useThemeStore');
    const s = useThemeStore.getState();
    expect(s.mode).toBe('light');
    expect(s.initialized).toBe(true);
  });

  it('toggle flips dark -> light and persists', async () => {
    const { useThemeStore } = await import('../useThemeStore');
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().mode).toBe('light');
    expect(memoryStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(useThemeStore.getState().initialized).toBe(true);
  });

  it('set() overrides and marks initialized', async () => {
    const { useThemeStore } = await import('../useThemeStore');
    useThemeStore.getState().set('light');
    expect(useThemeStore.getState().mode).toBe('light');
    expect(memoryStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('resetToSystem() drops the persisted value and follows the OS again', async () => {
    memoryStorage.setItem(STORAGE_KEY, 'light');
    const { useThemeStore } = await import('../useThemeStore');
    expect(useThemeStore.getState().mode).toBe('light');
    useThemeStore.getState().resetToSystem();
    // matchMedia mock returns matches=false (dark), so the system mode
    // is dark after the reset.
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().initialized).toBe(false);
  });

  it('applies data-theme attribute to <html> on toggle', async () => {
    document.documentElement.removeAttribute('data-theme');
    const { useThemeStore } = await import('../useThemeStore');
    // Initial apply happens at module load.
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    useThemeStore.getState().toggle();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
