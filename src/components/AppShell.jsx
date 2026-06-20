import { useState } from 'react'
import Vestiaire from '../pages/Vestiaire'
import Pronos from '../pages/Pronos'
import Classement from '../pages/Classement'
import Bonus from '../pages/Bonus'
import Profil from '../pages/Profil'

const TABS = [
  { id: 'vestiaire',  ico: '🏠', lbl: 'Vestiaire' },
  { id: 'pronos',     ico: '📜', lbl: 'Pronos' },
  { id: 'classement', ico: '🏆', lbl: 'Classement' },
  { id: 'bonus',      ico: '🎁', lbl: 'Bonus' },
  { id: 'profil',     ico: '👤', lbl: 'Profil' },
]

export default function AppShell() {
  const [tab, setTab] = useState('vestiaire')

  const pages = {
    vestiaire:  <Vestiaire onNavigate={setTab} />,
    pronos:     <Pronos />,
    classement: <Classement />,
    bonus:      <Bonus />,
    profil:     <Profil />,
  }

  return (
    <div className="app-shell">
      <div className="screen-content">
        {pages[tab]}
      </div>
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-item ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-ico">{t.ico}</span>
            <span className="tab-lbl">{t.lbl}</span>
            {t.id === 'pronos' && tab !== 'pronos' && <div className="tab-notif show" />}
          </button>
        ))}
      </div>
    </div>
  )
}
