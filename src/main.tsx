import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';

import './styles/index.css';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      enabled: false,
    },
  },
});

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
