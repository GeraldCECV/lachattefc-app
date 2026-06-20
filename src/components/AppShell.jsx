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
          overflowY:'auto', overflowX:'hidden',
          WebkitOverflowScrolling:'touch',
          paddingTop:'env(safe-area-inset-top)',
          paddingBottom:'calc(env(safe-area-inset-bottom) + 20px)',
        }}>
          {/* Bouton fermer FIXE en haut */}
          <div style={{
            position:'fixed',
            top:'env(safe-area-inset-top)',
            right:0, left:0,
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'12px 20px',
            background:'rgba(7,16,12,.98)',
            borderBottom:'1px solid var(--bd)',
            zIndex:600,
          }}>
            <div className="page-title" style={{ fontSize:26 }}>Profil</div>
            <button onClick={() => setShowProfil(false)} style={{
              background:'var(--r-dim)', border:'1px solid var(--r-b)',
              borderRadius:10, padding:'9px 18px',
              color:'#FCA5A5', cursor:'pointer',
              fontSize:13, fontWeight:900,
              textTransform:'uppercase', letterSpacing:'.04em',
            }}>✕ Fermer</button>
          </div>
          {/* Spacer pour compenser le header fixe */}
          <div style={{ height:58 }} />
          <Profil />
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
