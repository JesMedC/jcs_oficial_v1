/*
 * dashboard-jarvis-fidelity (Slice B, T-047, REQ-DCF-006) —
 * `formatHour` returns the local `HH:MM hrs` clock time used by
 * `RecentActivityFeed` rows (and any future surface that wants
 * the same time-only chip). Extracted to its own module so
 * `react-refresh/only-export-components` stays happy with the
 * feed's component-only export list.
 *
 * Uses `Intl.DateTimeFormat('es-AR', { hour: '2-digit',
 * minute: '2-digit', hour12: false })` to guarantee a deterministic
 * two-digit pad regardless of the browser locale.
 */
const HOUR_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatHour(iso: string): string {
  return `${HOUR_FORMATTER.format(new Date(iso))} hrs`;
}
