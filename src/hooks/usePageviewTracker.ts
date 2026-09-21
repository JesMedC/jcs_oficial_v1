/*
 * p0c — usePageviewTracker hook.
 *
 * Llamado a ``recordPageview`` en mount + en cada cambio de ruta. Se
 * monta UNA sola vez cerca del layout raíz (``router/index.tsx``) —
 * internamente usa ``useLocation`` para detectar cambios.
 *
 * El hook no renderiza nada; sólo dispara el tracking.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { recordPageview } from '../lib/analytics/pageview';

export function usePageviewTracker(): void {
  const location = useLocation();

  useEffect(() => {
    const title = typeof document !== 'undefined' ? document.title : undefined;
    void recordPageview({
      page_path: location.pathname,
      page_title: title,
    });
  }, [location.pathname]);
}
