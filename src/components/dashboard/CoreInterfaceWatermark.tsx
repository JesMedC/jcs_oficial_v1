/*
 * dashboard-jarvis-fidelity (Slice A, T-032, REQ-CWM-003) —
 * the JARVIS-style chrome watermark.
 *
 * Three low-opacity text labels anchored to the dashboard's
 * chrome layer. Two read "Jarvis" (bottom-left + bottom-right
 * corners of the chrome frame) and one reads "Jade Capital
 * Suite · Core Interface" at the top-left. All three are
 * aria-hidden + pointer-events-none so they never intercept
 * clicks and never read out to screen readers.
 *
 * The component is purely presentational — no props, no state,
 * no effects. Lives alongside DotGrid + NeuralNetwork inside
 * the dashboard's `data-testid="dash-decor-layer"` chrome.
 */
export function CoreInterfaceWatermark(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-testid="core-interface-watermark"
      className="pointer-events-none absolute inset-0 z-0"
    >
      <span className="absolute top-4 left-4 font-display uppercase tracking-widest text-[10px] text-text-muted opacity-10">
        Jade Capital Suite · Core Interface
      </span>
      <span className="absolute bottom-4 left-4 font-display uppercase tracking-widest text-[10px] text-text-muted opacity-10">
        Jarvis
      </span>
      <span className="absolute bottom-4 right-4 font-display uppercase tracking-widest text-[10px] text-text-muted opacity-10">
        Jarvis
      </span>
    </div>
  );
}
