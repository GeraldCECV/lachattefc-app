import { useState } from 'react'
import { useUser } from '../App'
import Vestiaire from '../pages/Vestiaire'
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
  { id: 'vestiaire',  ico: 'vestiaire',  lbl: 'Profil' },
  { id: 'pronos',     ico: 'pronos',     lbl: 'Fais tes pronos' },
  { id: 'chatteux',   ico: 'live',       lbl: 'Live' },
  { id: 'classement', ico: 'classement', lbl: 'Classement' },
  { id: 'bonus',      ico: 'bonus',      lbl: 'Bonus' },
  { id: 'reglement',  ico: 'reglement',  lbl: 'Règles' },
]

export default function AppShell() {
  const [tab, setTab] = useState('vestiaire')
  const [showProfil, setShowProfil] = useState(false)
  const { profil } = useUser()

  const pages = {
    vestiaire:  <Vestiaire onNavigate={setTab} onProfil={() => setShowProfil(true)} profil={profil} />,
    pronos:     <Pronos />,
    chatteux:   <PronosChatteux />,
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
          <div style={{
            position:'fixed', top:'env(safe-area-inset-top)', right:0, left:0,
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


