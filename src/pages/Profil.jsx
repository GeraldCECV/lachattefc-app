import { useState, useEffect } from 'react'
import { doc, getDoc, getDocs, collection, query, orderBy } from 'firebase/firestore'
import { signOut, updatePassword } from 'firebase/auth'
import { useNotifications } from '../hooks/useNotifications'
import { db, auth } from '../firebase/config'
import { useUser } from '../App'
import logo from '../assets/logo-lachattefc.png'

export default function Profil() {
  const { profil, user } = useUser()
  const [stats, setStats] = useState(null)
  const { permission, requestPermission } = useNotifications(user?.uid)
  const [notifSent, setNotifSent] = useState(false)
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [changingPwd, setChangingPwd] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const snap = await getDoc(doc(db,'joueurs',user.uid))
      if (snap.exists()) setStats(snap.data())
      const jSnap = await getDocs(query(collection(db,'journees'),orderBy('numero','desc')))
      const hist = []
      for (const jDoc of jSnap.docs.slice(0,10)) {
        const j = jDoc.data()
        if (j.pointsJoueurs?.[user.uid] !== undefined) {
          hist.push({ numero:j.numero, pts:j.pointsJoueurs[user.uid], gain:j.gainsJoueurs?.[user.uid]||0, statut:j.statut })
        }
      }
      setHistorique(hist)
      setLoading(false)
    }
    load()
  }, [user])

  const handlePwd = async () => {
    if (newPwd.length < 6) { setPwdMsg('Minimum 6 caractères'); return }
    try {
      await updatePassword(user, newPwd)
      setPwdMsg('✅ Mot de passe changé !')
      setNewPwd('')
      setTimeout(() => { setPwdMsg(''); setChangingPwd(false) }, 2000)
    } catch(e) { setPwdMsg('Erreur — reconnecte-toi puis réessaie') }
  }

  const maxPts = historique.length > 0 ? Math.max(...historique.map(h=>h.pts), 1) : 1

  return (
    <div>
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div className="spinner" style={{ width:24, height:24 }}></div>
        </div>
      ) : (
        <>
          {/* Message de bienvenue */}
          <div style={{ padding:'16px 16px 0' }}>
            <div className="page-sub">{(() => {
              const prenom = profil?.nom?.split(' ')[0] || profil?.initiales || ''
              const msgs = [
                `Salut ${prenom} 👋`,
                `Prêt à tout rafler ${prenom} ? 💰`,
                `${prenom}, les matchs t'attendent ⚽`,
                `Alors ${prenom}, on sent le champion ? 🏆`,
                `${prenom}, montre-leur de quoi t'es capable 🔥`,
                `${prenom}, t'es le meilleur pronostiqueur de la Chatte ? 🐱`,
                `${prenom}, les gains t'attendent 💸`,
                `${prenom}, la Ligue 1 n'a qu'à bien se tenir ⚡`,
              ]
              const key = 'lachattefc_welcome_msg'
              const prevKey = 'lachattefc_welcome_msg_prev'
              let msg = sessionStorage.getItem(key)
              if (!msg) {
                const prev = sessionStorage.getItem(prevKey)
                const available = msgs.filter(m => m !== prev)
                msg = available[Math.floor(Math.random() * available.length)]
                sessionStorage.setItem(prevKey, msg)
                sessionStorage.setItem(key, msg)
              }
              return msg
            })()}</div>
          </div>

          {/* Carte profil */}
          <div style={{ margin:'14px 16px', background:'linear-gradient(135deg, rgba(17,31,23,.96), rgba(5,12,8,.98))', border:'1px solid var(--g-b)', borderRadius:'var(--R)', padding:20, boxShadow:'var(--shadow)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, right:0, width:120, height:120, background:'radial-gradient(circle at top right, rgba(155,226,45,.12), transparent)', pointerEvents:'none' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div className="av" style={{ width:56, height:56, fontSize:18, background:'var(--g-dim)', color:'var(--g)', border:'2px solid var(--g-b)', boxShadow:'0 0 20px rgba(155,226,45,.2)' }}>
                {profil?.initiales}
              </div>
              <div>
                <div style={{ fontFamily:'var(--D)', fontSize:26, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--tx)', textShadow:'0 0 12px rgba(155,226,45,.15)' }}>{profil?.nom}</div>
                <div style={{ fontSize:12, color:'var(--tx3)', marginTop:2 }}>{user?.email}</div>
                {profil?.role==='admin' && <span className="pill pill-g" style={{ marginTop:4, display:'inline-flex' }}>Admin</span>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ margin:'0 16px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { val:stats?.pointsTotal||0, lbl:'Points saison', color:'var(--g)' },
              { val:`${stats?.gainsTotal||0}€`, lbl:'Gains bruts', color:'var(--a)' },
              { val:stats?.journeesJouees||0, lbl:'Journées jouées', color:'var(--b)' },
              { val:stats?.absences||0, lbl:'Absences', color:(stats?.absences||0)>0?'var(--r)':'var(--tx3)' },
            ].map(s => (
              <div key={s.lbl} style={{ background:'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))', border:'1px solid var(--bd)', borderRadius:'var(--R)', padding:14, textAlign:'center', boxShadow:'var(--shadow)' }}>
                <div style={{ fontFamily:'var(--D)', fontSize:34, letterSpacing:'.03em', color:s.color, lineHeight:1, textShadow:`0 0 14px ${s.color}44` }}>{s.val}</div>
                <div style={{ fontSize:11, color:'var(--tx3)', marginTop:6, fontWeight:900, textTransform:'uppercase', letterSpacing:'.05em' }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Historique */}
          {historique.length > 0 && (
            <>
              <div className="section-lbl">📊 Historique récent</div>
              <div style={{ margin:'0 16px 14px' }} className="card">
                {historique.map(h => (
                  <div key={h.numero} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid rgba(155,226,45,.08)' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(155,226,45,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'var(--tx3)', flexShrink:0, fontFamily:'var(--D)', letterSpacing:'.04em' }}>
                      J{h.numero}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ height:6, background:'rgba(255,255,255,.055)', borderRadius:999, overflow:'hidden', boxShadow:'inset 0 1px 4px rgba(0,0,0,.3)' }}>
                        <div style={{ height:'100%', width:`${(h.pts/maxPts)*100}%`, background: h.pts>=5?'linear-gradient(90deg,#76B91D,#B9F84F)':h.pts>=3?'linear-gradient(90deg,#92400E,#FBBF24)':'linear-gradient(90deg,#7F1D1D,#F87171)', borderRadius:999, boxShadow:h.pts>=5?'0 0 8px rgba(155,226,45,.3)':'none' }}/>
                      </div>
                    </div>
                    <div style={{ fontFamily:'var(--D)', fontSize:22, color:'var(--tx)', letterSpacing:'.03em', minWidth:32, textAlign:'right' }}>{h.pts}</div>
                    <div style={{ fontSize:12, color:h.gain>0?'var(--g)':'var(--tx3)', fontWeight:900, minWidth:36, textAlign:'right' }}>
                      {h.gain>0?`+${h.gain}€`:'—'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Changer mdp */}
          <div className="section-lbl">🔔 Notifications</div>
          <div style={{ margin:'0 16px 14px' }} className="card">
            {permission === 'granted' ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
                <span style={{ fontSize:20 }}>✅</span>
                <span style={{ color:'var(--g)', fontWeight:700 }}>Notifications activées</span>
              </div>
            ) : permission === 'denied' ? (
              <div style={{ fontSize:13, color:'var(--r)', fontWeight:700 }}>
                ❌ Notifications bloquées — autorise-les dans les réglages de ton téléphone
              </div>
            ) : (
              <div>
                <div style={{ fontSize:13, color:'var(--tx2)', marginBottom:10, lineHeight:1.6 }}>
                  Reçois une notification quand une nouvelle journée est ouverte ou avant la deadline.
                </div>
                <button className="btn btn-secondary" style={{ width:'100%', justifyContent:'center' }}
                  onClick={async () => {
                    const ok = await requestPermission()
                    if (ok) setNotifSent(true)
                  }}>
                  🔔 Activer les notifications
                </button>
                {notifSent && <div style={{ fontSize:12, color:'var(--g)', marginTop:8, fontWeight:700 }}>✅ Notifications activées !</div>}
              </div>
            )}
          </div>

          <div className="section-lbl">🔐 Sécurité</div>
          <div style={{ margin:'0 16px 14px' }} className="card">
            {!changingPwd ? (
              <button className="btn btn-secondary" style={{ width:'100%', justifyContent:'center' }} onClick={() => setChangingPwd(true)}>
                🔑 Changer mon mot de passe
              </button>
            ) : (
              <div>
                <input type="password" className="input" placeholder="Nouveau mot de passe (6+ caractères)" value={newPwd} onChange={e=>setNewPwd(e.target.value)} style={{ marginBottom:10 }} />
                {pwdMsg && <div style={{ fontSize:12, color:pwdMsg.startsWith('✅')?'var(--g)':'var(--r)', marginBottom:8, fontWeight:700 }}>{pwdMsg}</div>}
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-primary" style={{ flex:1, height:42, fontSize:13 }} onClick={handlePwd}>Valider</button>
                  <button className="btn btn-secondary" onClick={()=>{setChangingPwd(false);setPwdMsg('')}}>Annuler</button>
                </div>
              </div>
            )}
          </div>

          {/* Logo + déco */}
          <div style={{ margin:'0 16px 12px', textAlign:'center' }}>
            <img src={logo} alt="La Chatte FC" style={{ width:100, opacity:.4, filter:'drop-shadow(0 0 10px rgba(155,226,45,.2))' }} />
          </div>

          {/* Déconnexion */}
          <div style={{ margin:'0 16px 40px' }}>
            <button onClick={() => signOut(auth)} style={{
              width:'100%', padding:14, background:'var(--r-dim)',
              border:'1px solid var(--r-b)', borderRadius:'var(--R)',
              color:'#FCA5A5', fontSize:13, fontWeight:900, cursor:'pointer',
              textTransform:'uppercase', letterSpacing:'.04em',
            }}>
              🚪 Déconnexion
            </button>
          </div>
        </>
      )}
    </div>
  )
}

