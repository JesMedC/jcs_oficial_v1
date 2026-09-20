/* SplitScreen — flex layout container that yields 70/30 columns.
 *
 * This component has no visual chrome of its own; the styling lives
 * in App.css so the layout rules stay close to the top-level
 * composition.
 */

import type { ReactNode } from "react";

interface SplitScreenProps {
  left: ReactNode;
  right: ReactNode;
}

export function SplitScreen({ left, right }: SplitScreenProps) {
  return (
    <div className="split">
      <section className="split__left" aria-label="Candlestick chart">
        {left}
      </section>
      <aside className="split__right" aria-label="Alerts panel">
        {right}
      </aside>
    </div>
  );
}
