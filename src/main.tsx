/*
 * portal-fase0a-base — root entry.
 *
 * NOTE: This file intentionally instantiates the QueryClient inline
 * from `src/lib/queryClient.ts` so devtools and React Query DevTools
 * (when added) target the same client every page uses. The exported
 * client also lets tests wrap a render with the same provider.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';

import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/rajdhani/400.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';

import './styles/index.css';
import { App } from './App';
import { queryClient } from './lib/queryClient';

const mountTarget = document.getElementById('root');
if (mountTarget === null) {
  throw new Error('Root mount target "#root" not found in index.html');
}

createRoot(mountTarget).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
