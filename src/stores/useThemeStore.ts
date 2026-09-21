/*
 * design-system-v1 (Wave 5) — Theme store.
 *
 * Antes de Wave 5 el portal era dark-only y el fondo se aplicaba
 * directo en ``src/styles/index.css`` (``html, body, #root { background:
 * #060b10; }``). Esta store introduce el switch light/dark:
 *
 *   - ``mode``: 'dark' | 'light'. Default dark (la app entera está
 *     dark hoy, no queremos un flash blanco en el primer load).
 *   - En el primer mount: si el usuario NO tocó el toggle todavía
 *     (``!initialized``), respeta ``prefers-color-scheme`` del sistema.
 *   - El ``data-theme`` se aplica al ``<html>`` para que las CSS vars
 *     de ``themes.css`` hagan el resto. La app NO usa Tailwind
 *     ``dark:`` variants para esto (los tokens base son dark) — los
 *     componentes duales leen ``var(--color-*)`` directamente.
 *   - Persistencia en localStorage bajo ``jcs.theme.mode`` — el primer
 *     load lee el valor guardado y lo aplica inmediatamente para
 *     evitar el flash de tema equivocado.
 *
 * SSR-safe: el acceso a ``window`` está gated para que el módulo sea
 * importable desde tests con jsdom sin fallar al inicializar.
 */
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'jcs.theme.mode';

function detectSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function readStoredMode(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
    return null;
  } catch {
    return null;
  }
}

function writeStoredMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* localStorage unavailable (private mode, quota, etc.) — non-fatal */
  }
}

function applyThemeToDom(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
}

interface ThemeState {
  readonly mode: ThemeMode;
  readonly initialized: boolean;
  readonly toggle: () => void;
  readonly set: (next: ThemeMode) => void;
  readonly resetToSystem: () => void;
}

function pickInitialMode(): { mode: ThemeMode; initialized: boolean } {
  const stored = readStoredMode();
  if (stored !== null) {
    return { mode: stored, initialized: true };
  }
  // First load: respetar prefers-color-scheme, pero el store arranca
  // como ``!initialized`` para que un resetToSystem() pueda volver al
  // modo del sistema operativo más adelante.
  return { mode: detectSystemTheme(), initialized: false };
}

const initial = pickInitialMode();
// Apply synchronously at module load to avoid the first-paint flash.
// (Tests with jsdom skip the actual DOM mutation since ``document``
// is undefined in pure Node environments.)
applyThemeToDom(initial.mode);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initial.mode,
  initialized: initial.initialized,
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    writeStoredMode(next);
    applyThemeToDom(next);
    set({ mode: next, initialized: true });
  },
  set: (next) => {
    writeStoredMode(next);
    applyThemeToDom(next);
    set({ mode: next, initialized: true });
  },
  resetToSystem: () => {
    const sys = detectSystemTheme();
    applyThemeToDom(sys);
    set({ mode: sys, initialized: false });
  },
}));

// Hook selector helpers (less typing at call sites).
export const useThemeMode = (): ThemeMode => useThemeStore((s) => s.mode);
export const useIsDark = (): boolean => useThemeStore((s) => s.mode === 'dark');
