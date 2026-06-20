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
    vestiaire:  <Vestiaire onNavigate={setTab} />,
    pronos:     <Pronos />,
    classement: <Classement />,
    bonus:      <Bonus />,
    reglement:  <Reglement />,
  }

  return (
    <div className="app-shell">

      {/* Profil modal */}
      {showProfil && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:500, display:'flex', flexDirection:'column', paddingTop:'env(safe-area-inset-top)' }}>
          <div style={{ background:'linear-gradient(180deg, rgba(17,31,23,.98), rgba(8,15,11,.99))', flex:1, overflow:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--bd)' }}>
              <div className="page-title" style={{ fontSize:28 }}>Profil</div>
              <button onClick={() => setShowProfil(false)} style={{ background:'rgba(255,255,255,.06)', border:'1px solid var(--bd2)', borderRadius:10, padding:'6px 12px', color:'var(--tx2)', cursor:'pointer', fontSize:13, fontWeight:700 }}>✕ Fermer</button>
            </div>
            <Profil />
          </div>
        </div>
      )}

      <div className="screen-content">
        {/* Bouton profil en haut à droite sur le vestiaire */}
        <div style={{ position:'absolute', top:16, right:16, zIndex:50 }}>
          {tab === 'vestiaire' && (
            <button onClick={() => setShowProfil(true)} style={{
              width:36, height:36, borderRadius:'50%',
              background:'var(--g-dim)', border:'1px solid var(--g-b)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, fontWeight:900, color:'var(--g)',
              cursor:'pointer', boxShadow:'0 0 10px rgba(155,226,45,.2)',
            }}>
              {profil?.initiales?.slice(0,2) || '👤'}
            </button>
          )}
        </div>
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
