import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Vestiaire from '../pages/Vestiaire'
import Pronos from '../pages/Pronos'
import Classement from '../pages/Classement'
import Bonus from '../pages/Bonus'
import Profil from '../pages/Profil'
import { useUser } from '../App'

const TABS = [
  { id: 'vestiaire',   icon: '🏠', label: 'Vestiaire' },
  { id: 'pronos',      icon: '📜', label: 'Pronos' },
  { id: 'classement',  icon: '🏆', label: 'Classement' },
  { id: 'bonus',       icon: '🎁', label: 'Bonus' },
  { id: 'profil',      icon: '👤', label: 'Profil' },
]

export default function AppShell() {
  const [activeTab, setActiveTab] = useState('vestiaire')
  const { profil } = useUser()

  const pages = {
    vestiaire:  <Vestiaire onNavigate={setActiveTab} />,
    pronos:     <Pronos />,
    classement: <Classement />,
    bonus:      <Bonus />,
    profil:     <Profil />,
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>


      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {pages[activeTab]}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-item ${activeTab === t.id ? 'on' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="tab-ico">{t.icon}</span>
            <span className="tab-lbl">{t.label}</span>
            {t.id === 'pronos' && activeTab !== 'pronos' && (
              <div className="tab-notif show" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
