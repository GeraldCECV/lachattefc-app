import { useState, useEffect } from 'react'
import { doc, getDoc, getDocs, collection, query, orderBy } from 'firebase/firestore'
import { signOut, updatePassword } from 'firebase/auth'
import { httpsCallable, getFunctions } from 'firebase/functions'
import { db, auth } from '../firebase/config'
import { CLUBS_L1_2627 } from '../firebase/constants'
import { useUser } from '../App'
import logo from '../assets/logo-lachattefc.png'

export default function Profil() {
  const { profil, user } = useUser()
  const [stats, setStats] = useState(null)
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [changingPwd, setChangingPwd] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')

  // Paris Annexe
  const [paConfig, setPaConfig] = useState(null)
  const [paMonProno, setPaMonProno] = useState(null)
  const [showParisAnnexe, setShowParisAnnexe] = useState(false)
  const [paPodium, setPaPodium] = useState(['', '', ''])
  const [paLdc, setPaLdc] = useState('')
  const [paEuropa, setPaEuropa] = useState('')
  const [paButeur, setPaButeur] = useState('')
  const [paPasseur, setPaPasseur] = useState('')
  const [paSaving, setPaSaving] = useState(false)
  const [paMsg, setPaMsg] = useState('')

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

      // Paris Annexe
      const paConfigSnap = await getDoc(doc(db, 'parisAnnexe', 'config'))
      if (paConfigSnap.exists()) {
        const cfg = paConfigSnap.data()
        setPaConfig(cfg)
        const monPronoSnap = await getDoc(doc(db, 'parisAnnexe', 'config', 'pronos', user.uid))
        if (monPronoSnap.exists()) setPaMonProno(monPronoSnap.data())
      }

      setLoading(false)
    }
    load()
  }, [user])

  const ouvrirParisAnnexe = () => {
    setPaPodium(['', '', ''])
    setPaLdc(''); setPaEuropa(''); setPaButeur(''); setPaPasseur('')
    setPaMsg('')
    setShowParisAnnexe(true)
  }

  const soumettreParisAnnexe = async () => {
    if (paPodium.some(p => !p) || new Set(paPodium).size < 3) { setPaMsg('❌ Choisis 3 clubs différents pour le podium'); return }
    if (!paLdc.trim() || !paEuropa.trim() || !paButeur.trim() || !paPasseur.trim()) { setPaMsg('❌ Tous les champs sont requis'); return }
    setPaSaving(true); setPaMsg('')
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'soumettreParisAnnexe')
      await fn({ podium: paPodium, ldc: paLdc.trim(), europa: paEuropa.trim(), buteur: paButeur.trim(), passeur: paPasseur.trim() })
      setPaMonProno({ podium: paPodium, ldc: paLdc.trim(), europa: paEuropa.trim(), buteur: paButeur.trim(), passeur: paPasseur.trim() })
      setPaMsg('✅ Pronostic enregistré !')
      setTimeout(() => setShowParisAnnexe(false), 1200)
    } catch(e) {
      setPaMsg('❌ ' + e.message)
    }
    setPaSaving(false)
  }

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
              const key = 'lachattefc_welcome_msg_idx'
              const prevKey = 'lachattefc_welcome_msg_prev_idx'
              let idx = sessionStorage.getItem(key)
              if (idx === null) {
                const prev = sessionStorage.getItem(prevKey)
                const available = msgs.map((_, i) => i).filter(i => String(i) !== prev)
                idx = available[Math.floor(Math.random() * available.length)]
                sessionStorage.setItem(prevKey, String(idx))
                sessionStorage.setItem(key, String(idx))
              }
              return msgs[parseInt(idx)]
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
              { val:`${Math.round(((stats?.gainsTotal||0) - (stats?.journeesJouees||0)*5)*100)/100}€`, lbl:'Gains nets', color: ((stats?.gainsTotal||0) - (stats?.journeesJouees||0)*5) >= 0 ? 'var(--g)' : 'var(--r)' },
              { val:stats?.journeesJouees||0, lbl:'Journées jouées', color:'var(--b)' },
              { val:stats?.absences||0, lbl:'Absences', color:(stats?.absences||0)>0?'var(--r)':'var(--tx3)' },
            ].map(s => (
              <div key={s.lbl} style={{ background:'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))', border:'1px solid var(--bd)', borderRadius:'var(--R)', padding:14, textAlign:'center', boxShadow:'var(--shadow)' }}>
                <div style={{ fontFamily:'var(--D)', fontSize:34, letterSpacing:'.03em', color:s.color, lineHeight:1, textShadow:`0 0 14px ${s.color}44` }}>{s.val}</div>
                <div style={{ fontSize:11, color:'var(--tx3)', marginTop:6, fontWeight:900, textTransform:'uppercase', letterSpacing:'.05em' }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Paris Annexe */}
          {paConfig && (
            <>
              <div className="section-lbl">🏆 Paris Annexe — saison 26/27</div>
              <div style={{ margin:'0 16px 14px' }} className="card">
                {paConfig.statut === 'resultats' ? (
                  <div>
                    <div style={{ fontSize:13, color:'var(--tx2)', marginBottom:10, fontWeight:700 }}>Résultats tombés !</div>
                    {paConfig.gains?.[user?.uid] > 0 ? (
                      <div style={{ fontSize:14, color:'var(--g)', fontWeight:900 }}>✅ Tu as gagné +{paConfig.gains[user.uid].toFixed(2)}€ !</div>
                    ) : (
                      <div style={{ fontSize:13, color:'var(--tx3)' }}>Pas de gain cette fois — retente l'an prochain.</div>
                    )}
                  </div>
                ) : paMonProno ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, marginBottom:2 }}>
                      <span style={{ fontSize:18 }}>✅</span>
                      <span style={{ color:'var(--g)', fontWeight:700 }}>Pronostic enregistré</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--tx3)', marginTop:6, lineHeight:1.6 }}>
                      Podium : {paMonProno.podium.join(' → ')}<br/>
                      LDC : {paMonProno.ldc} · Europa : {paMonProno.europa}<br/>
                      Buteur : {paMonProno.buteur} · Passeur : {paMonProno.passeur}
                    </div>
                  </div>
                ) : paConfig.statut === 'ouvert' ? (
                  <div>
                    <div style={{ fontSize:13, color:'var(--tx2)', marginBottom:10, lineHeight:1.6, textAlign:'center' }}>
                      Pronostique le podium final de L1, les vainqueurs LDC/Europa League, et le meilleur buteur/passeur de la saison. Mise totale : 6€.
                    </div>
                    {paConfig.deadline && (
                      <div style={{ textAlign:'center', marginBottom:12 }}>
                        <span style={{ display:'inline-block', padding:'8px 14px', background:'rgba(155,226,45,.06)', border:'1px solid var(--g-b)', borderRadius:'var(--Rs)', fontSize:12, color:'var(--g)', fontWeight:700 }}>
                          ⏰ Deadline : {new Date(paConfig.deadline.seconds*1000).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' })}
                        </span>
                      </div>
                    )}
                    <button className="btn btn-secondary" style={{ width:'100%', display:'flex', justifyContent:'center', textAlign:'center' }} onClick={ouvrirParisAnnexe}>
                      🏆 Je tente ma chance
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize:13, color:'var(--tx3)' }}>Fermé — tu n'as pas soumis de pronostic à temps.</div>
                )}
              </div>
            </>
          )}
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

      {/* Modal Paris Annexe */}
      {showParisAnnexe && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:500 }}>
          <div style={{ position:'fixed', top:'8dvh', left:0, right:0, bottom:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain', borderRadius:'20px 20px 0 0', padding:'20px 20px calc(20px + env(safe-area-inset-bottom))', background:'linear-gradient(180deg, rgba(20,36,27,.99), rgba(9,17,12,.995))', border:'1px solid var(--bd)', borderBottom:'none', boxShadow:'var(--shadow)' }}>
            <div className="page-title" style={{ fontSize:22, marginBottom:4 }}>🏆 Pronostic saison</div>
            <div style={{ fontSize:12, color:'var(--tx3)', marginBottom:16 }}>À soumettre une seule fois, non modifiable ensuite.</div>

            {paMsg && <div className={`alert ${paMsg.startsWith('✅')?'alert-g':'alert-r'}`} style={{ marginBottom:12 }}>{paMsg}</div>}

            <div className="form-group">
              <label className="label">🥇 1er de L1</label>
              <select className="input" value={paPodium[0]} onChange={e => setPaPodium([e.target.value, paPodium[1], paPodium[2]])}>
                <option value="">— Choisir —</option>
                {CLUBS_L1_2627.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginTop:10 }}>
              <label className="label">🥈 2e de L1</label>
              <select className="input" value={paPodium[1]} onChange={e => setPaPodium([paPodium[0], e.target.value, paPodium[2]])}>
                <option value="">— Choisir —</option>
                {CLUBS_L1_2627.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginTop:10 }}>
              <label className="label">🥉 3e de L1</label>
              <select className="input" value={paPodium[2]} onChange={e => setPaPodium([paPodium[0], paPodium[1], e.target.value])}>
                <option value="">— Choisir —</option>
                {CLUBS_L1_2627.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginTop:14 }}>
              <label className="label">🏆 Vainqueur Ligue des Champions</label>
              <input className="input" placeholder="ex: Real Madrid" value={paLdc} onChange={e => setPaLdc(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginTop:10 }}>
              <label className="label">🏆 Vainqueur Europa League</label>
              <input className="input" placeholder="ex: Tottenham" value={paEuropa} onChange={e => setPaEuropa(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginTop:10 }}>
              <label className="label">⚽ Meilleur buteur L1</label>
              <input className="input" placeholder="ex: Kylian Mbappé" value={paButeur} onChange={e => setPaButeur(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginTop:10 }}>
              <label className="label">🎯 Meilleur passeur L1</label>
              <input className="input" placeholder="ex: Ousmane Dembélé" value={paPasseur} onChange={e => setPaPasseur(e.target.value)} />
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={soumettreParisAnnexe} disabled={paSaving}>
                {paSaving ? <><div className="spinner" style={{width:14,height:14}}/> Envoi...</> : '✅ Valider mon pronostic'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowParisAnnexe(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}









