/*
 * p0c — PageviewTracker component.
 *
 * Componente no-op que monta el `usePageviewTracker` hook. Separado del
 * hook para que el fast-refresh de Vite siga funcionando (el hook vive
 * en `usePageviewTracker.ts`, el componente wrapper acá).
 */
import { usePageviewTracker } from './usePageviewTracker';

export function PageviewTracker(): null {
  usePageviewTracker();
  return null;
}
