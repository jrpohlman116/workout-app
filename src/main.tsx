import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SW_UPDATE_EVENT } from './lib/constants';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const notifyIfReady = (worker: ServiceWorker | null) => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          // 'installed' with an existing controller = an update, not a first install
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
          }
        });
      };

      if (registration.waiting && navigator.serviceWorker.controller) {
        window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
      }
      notifyIfReady(registration.installing);
      registration.addEventListener('updatefound', () => notifyIfReady(registration.installing));

      // Re-check for updates when the app returns to the foreground —
      // matters for an installed PWA that stays "open" for days.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => { /* offline — try again next time */ });
        }
      });
    }).catch(() => {
      // Service worker registration failed
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
