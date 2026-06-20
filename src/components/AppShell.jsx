import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useUser } from '../App'
import Vestiaire from '../pages/Vestiaire'
import Pronos from '../pages/Pronos'
import Classement from '../pages/Classement'
import Bonus from '../pages/Bonus'
import Reglement from '../pages/Reglement'
import Profil from '../pages/Profil'

const TABS = [
  { id: 'vestiaire',  ico: '🏠', lbl: 'Vestiaire' },
  { id: 'pronos',     ico: '📜', lbl: 'Pronos' },
  { id: 'classement', ico: '🏆', lbl: 'Classement' },
  { id: 'bonus',      ico: '🎁', lbl: 'Bonus' },
  { id: 'reglement',  ico: '📖', lbl: 'Règlement' },
]

export default function AppShell() {
  const [tab, setTab] = useState('vestiaire')
  const [showProfil, setShowProfil] = useState(false)
  const { profil } = useUser()

  const pages = {
    vestiaire:  <Vestiaire onNavigate={setTab} onProfil={() => setShowProfil(true)} profil={profil} />,
    pronos:     <Pronos />,
    classement: <Classement />,
    bonus:      <Bonus />,
    reglement:  <Reglement />,
  }

  return (
    <div className="app-shell">

      {/* Profil modal */}
      {showProfil && (
        <div style={{
          position:'fixed', inset:0, zIndex:500,
          background:'linear-gradient(180deg, rgba(7,16,12,.99), rgba(5,10,8,.99))',
          display:'flex', flexDirection:'column',
          paddingTop:'env(safe-area-inset-top)',
          paddingBottom:'env(safe-area-inset-bottom)',
        }}>
          {/* Header fixe */}
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'14px 20px',
            borderBottom:'1px solid var(--bd)',
            background:'rgba(7,16,12,.98)',
            flexShrink:0,
          }}>
            <div className="page-title" style={{ fontSize:28 }}>Profil</div>
            <button
              onClick={() => setShowProfil(false)}
              style={{
                background:'var(--r-dim)', border:'1px solid var(--r-b)',
                borderRadius:10, padding:'8px 16px',
                color:'#FCA5A5', cursor:'pointer',
                fontSize:13, fontWeight:900,
                textTransform:'uppercase', letterSpacing:'.04em',
              }}
            >
              ✕ Fermer
            </button>
          </div>
          {/* Contenu scrollable */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
            <Profil />
          </div>
        </div>
      )}

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
