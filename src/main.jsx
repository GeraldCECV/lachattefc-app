import React from 'react';
import ReactDOM from 'react-dom/client';
import { initSentry } from './sentry.js';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Initialize Sentry error tracking
initSentry();

// Le SW ne vérifie une nouvelle version qu'au chargement complet — jamais
// pendant la navigation interne (SPA). On expose un checker global que
// AppShell appelle à chaque changement d'onglet pour forcer cette vérif.
try {
  registerSW({
    onNeedRefresh() {
      try {
        window.location.reload();
      } catch (e) {
        console.error('Reload error:', e);
      }
    },
    onOfflineReady() {},
    onRegisterError(error) {
      console.error('SW registration error:', error);
      // Continue quand même, l'app fonctionne sans SW
    }
  });
} catch (e) {
  console.error('SW setup error:', e);
  // Si le SW setup échoue, l'app continue sans SW
}

window.__checkForAppUpdate = () => {
  try {
    navigator.serviceWorker?.getRegistration().then(reg => reg?.update()).catch(e => {
      console.debug('Update check error:', e);
    });
  } catch (e) {
    console.debug('Service Worker not available:', e);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
