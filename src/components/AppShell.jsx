import { useState, useEffect } from 'react'
import { useUser } from '../App'
import Pronos from '../pages/Pronos'
import PronosChatteux from '../pages/PronosChatteux'
import Classement from '../pages/Classement'
import Bonus from '../pages/Bonus'
import Reglement from '../pages/Reglement'
import Profil from '../pages/Profil'

function TabIcon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    vestiaire:   <><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></>,
    pronos:      <><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-3"/><path d="M9 12h6"/><path d="M9 16h4"/></>,
    chatteux:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    classement:  <><polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/></>,
    bonus:       <><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>,
    reglement:   <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    live:        <><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

const TABS = [
  { id: 'classement', ico: 'classement', lbl: 'Classement' },
  { id: 'pronos',     ico: 'pronos',     lbl: 'Fais tes pronos' },
  { id: 'chatteux',   ico: 'live',       lbl: 'Live' },
  { id: 'bonus',      ico: 'bonus',      lbl: 'Bonus' },
  { id: 'reglement',  ico: 'reglement',  lbl: 'Règles' },
  { id: 'vestiaire',  ico: 'vestiaire',  lbl: 'Profil' },
]

export default function AppShell() {
  const [tab, setTab] = useState('classement')
  const { profil } = useUser()

  const changerOnglet = (id) => {
    setTab(id)
    // Vérifie en tâche de fond si une nouvelle version de l'app est dispo —
    // si oui, rechargement auto (via onNeedRefresh dans main.jsx)
    window.__checkForAppUpdate?.()
  }

  // Masque la barre du bas dès qu'un champ (input/select/textarea) prend
  // le focus n'importe où dans l'app — pas seulement dans un modal. Sur
  // iOS, le clavier natif (ou un sélecteur natif comme <select>) redimensionne
  // le viewport visuel, ce qui fait "sauter" la barre en position:fixed.
  // La solution robuste est de la masquer pendant la saisie plutôt que
  // d'essayer de la stabiliser pendant que ça bouge.
  useEffect(() => {
    const CHAMPS = ['INPUT', 'SELECT', 'TEXTAREA']
    const onFocusIn = (e) => {
      if (CHAMPS.includes(e.target.tagName)) document.body.classList.add('modal-open')
    }
    const onFocusOut = (e) => {
      if (!CHAMPS.includes(e.target.tagName)) return
      document.body.classList.remove('modal-open')
      // Après fermeture du clavier iOS, l'en-tête peut rester visuellement
      // "gelé" sous la status bar — un simple repaint (transform, display
      // toggle) ne suffit pas à le réveiller. Ce qui marche à coup sûr,
      // observé en test : changer d'onglet puis revenir. On reproduit
      // donc ce même mécanisme automatiquement — un vrai démontage/
      // remontage React de la page via son propre état, pas juste un
      // effet visuel — plutôt que de deviner une nouvelle astuce.
      setTimeout(() => {
        setTab(t => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTab(t)
              // En plus du remount : un vrai scroll animé (pas un saut
              // instantané) sur le contenu qui vient d'être remonté —
              // se rapproche davantage d'un geste de scroll manuel,
              // qui est ce qui répare le souci de façon fiable en test.
              requestAnimationFrame(() => {
                const contenu = document.querySelector('.screen-content')
                if (contenu) {
                  contenu.scrollTo({ top: 20, behavior: 'smooth' })
                  setTimeout(() => contenu.scrollTo({ top: 0, behavior: 'smooth' }), 150)
                }
              })
            })
          })
          return '__refresh__'
        })
        window.scrollTo(0, 0)
      }, 350)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  const pages = {
    vestiaire:  <Profil />,
    pronos:     <Pronos />,
    chatteux:   <PronosChatteux />,
    classement: <Classement />,
    bonus:      <Bonus />,
    reglement:  <Reglement />,
  }

  return (
    <div className="app-shell">

      <div className="screen-content">
        {pages[tab]}
      </div>

      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-item ${tab === t.id ? 'on' : ''}`} onClick={() => changerOnglet(t.id)}>
            <span className="tab-ico">
              <TabIcon name={t.ico} size={20} />
            </span>
            <span className="tab-lbl">{t.lbl}</span>
            
          </button>
        ))}
      </div>
    </div>
  )
}








