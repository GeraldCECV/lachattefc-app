import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Le SW ne vérifie une nouvelle version qu'au chargement complet — jamais
// pendant la navigation interne (SPA). On expose un checker global que
// AppShell appelle à chaque changement d'onglet pour forcer cette vérif.
registerSW({
  onNeedRefresh() { window.location.reload() },
  onOfflineReady() {},
})
window.__checkForAppUpdate = () => {
  navigator.serviceWorker?.getRegistration().then(reg => reg?.update())
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)

