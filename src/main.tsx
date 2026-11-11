import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root';
import './styles/tokens.css';
import './styles/app.css';
import './styles/print.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// Ask the browser to keep planner data even under storage pressure.
navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is optional */
    });
  });
}

if (import.meta.env.DEV) {
  // Dev-only helpers for manual QA.
  Promise.all([import('./store/store'), import('./lib/sample')]).then(([store, sample]) => {
    (window as unknown as { __dongdong: unknown }).__dongdong = {
      store: store.useStore,
      loadSample: () => store.useStore.getState().replaceAll(sample.sampleData()),
    };
  });
}
