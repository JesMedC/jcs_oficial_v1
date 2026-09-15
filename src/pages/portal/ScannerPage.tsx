/*
 * ScannerPage — /portal/scanner (Market Analyzer Bot main view).
 *
 * Two-column layout (per spec):
 *
 *   ┌────────────┐ ┌────────────────────────────────────────────┐
 *   │  ALERT     │ │              CHART AREA                     │
 *   │  PANEL     │ │  ┌──────────────────────────────────────┐ │
 *   │  (left)    │ │  │   Candles M5 + EMA 200               │ │
 *   │            │ │  ├──────────────────────────────────────┤ │
 *   │  ~320px    │ │  │   Stochastic (5,3,3) oscillator      │ │
 *   │  scrollable│ │  │   >90 overbought / <10 oversold      │ │
 *   └────────────┘ └────────────────────────────────────────────┘
 *
 * Grid is ``grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4`` so on
 * phones the panel collapses under the chart instead of squeezing
 * sideways (and the chart still gets the full viewport width).
 *
 * No KPIs, no other charts — just this view's pair of surfaces. The
 * existing toast cluster still floats over the page because PortalShell
 * mounts ``AlertsToast`` at the dashboard level only; we intentionally
 * do NOT mount it here so the left-column cards remain the canonical
 * alert UI for this page.
 */
import { SeoHead } from '../../components/SeoHead';
import { ScannerAlertPanel } from '../../components/scanner/ScannerAlertPanel';
import { ScannerChart } from '../../components/scanner/ScannerChart';

export function ScannerPage(): JSX.Element {
  return (
    <>
      <SeoHead
        title="Scanner"
        description="Market Analyzer Bot: alertas en vivo del scanner Stochastic + EMA 200."
        canonicalPath="/portal/scanner"
        noindex
      />
      <div className="w-full px-2 md:px-4 py-3 md:py-4 flex flex-col gap-4">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
              Market Analyzer Bot
            </span>
            <h1
              data-testid="scanner-page-title"
              className="font-display uppercase tracking-wide text-2xl md:text-3xl mt-1"
            >
              Analizador de mercado
            </h1>
            <p className="text-text-secondary font-body text-sm md:text-base mt-2 max-w-2xl">
              Indicadores en vivo + alertas del bot. Tocá
              <span className="text-primary"> Cargar en Diario</span> para
              registrar la operación en tu journal.
            </p>
          </div>
        </header>

        <div
          data-testid="scanner-page-grid"
          className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4"
        >
          <div data-testid="scanner-page-left-column">
            <ScannerAlertPanel />
          </div>
          <div data-testid="scanner-page-right-column" className="min-w-0">
            <ScannerChart />
          </div>
        </div>
      </div>
    </>
  );
}
