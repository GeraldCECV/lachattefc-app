import { useState, useEffect } from 'react'
import { doc, getDoc, getDocs, collection, query, orderBy } from 'firebase/firestore'
import { signOut, updatePassword } from 'firebase/auth'
import { db, auth } from '../firebase/config'
import { useUser } from '../App'

export default function Profil() {
  const { profil, user } = useUser()
  const [stats, setStats] = useState(null)
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [changingPwd, setChangingPwd] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const snap = await getDoc(doc(db, 'joueurs', user.uid))
      if (snap.exists()) setStats(snap.data())

      // Historique journées
      const jSnap = await getDocs(query(collection(db, 'journees'), orderBy('numero', 'desc')))
      const hist = []
      for (const jDoc of jSnap.docs.slice(0, 10)) {
        const j = jDoc.data()
        if (j.pointsJoueurs?.[user.uid] !== undefined) {
          hist.push({
            numero: j.numero,
            pts: j.pointsJoueurs[user.uid],
            gain: j.gainsJoueurs?.[user.uid] || 0,
            statut: j.statut,
          })
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
    } catch(e) {
      setPwdMsg('Erreur — reconnecte-toi puis réessaie')
    }
  }

  const maxPts = historique.length > 0 ? Math.max(...historique.map(h => h.pts)) : 1

  return (
    <div className="scroll-area">
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontFamily: 'var(--D)', fontSize: 28, letterSpacing: '.04em' }}>👤 Profil</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 24, height: 24 }}></div>
        </div>
      ) : (
        <>
          {/* Carte profil */}
          <div style={{ margin: '14px 16px', background: 'linear-gradient(135deg, var(--bg2), #0d1a0f)', border: '1px solid var(--g-b)', borderRadius: 'var(--R)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="av" style={{ width: 56, height: 56, background: 'var(--g-dim)', color: 'var(--g)', fontSize: 18, border: '2px solid var(--g-b)' }}>
                {profil?.initiales}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--D)', fontSize: 24, letterSpacing: '.04em', color: 'var(--tx)' }}>{profil?.nom}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>{user?.email}</div>
                {profil?.role === 'admin' && (
                  <span className="pill pill-g" style={{ marginTop: 4 }}>Admin</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ margin: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { val: stats?.pointsTotal || 0, lbl: 'Points saison', color: 'var(--g)' },
              { val: `${stats?.gainsTotal || 0}€`, lbl: 'Gains bruts', color: 'var(--a)' },
              { val: stats?.journeesJouees || 0, lbl: 'Journées jouées', color: 'var(--b)' },
              { val: stats?.absences || 0, lbl: 'Absences', color: stats?.absences > 0 ? 'var(--r)' : 'var(--tx3)' },
            ].map(s => (
              <div key={s.lbl} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--D)', fontSize: 32, letterSpacing: '.03em', color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 5 }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Historique */}
          {historique.length > 0 && (
            <>
              <div className="section-lbl">📊 Historique récent</div>
              <div style={{ margin: '0 16px 14px' }} className="card">
                {historique.map(h => (
                  <div key={h.numero} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--bd)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--tx3)', flexShrink: 0 }}>
                      J{h.numero}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(h.pts / maxPts) * 100}%`, background: h.pts >= 5 ? 'var(--g)' : h.pts >= 3 ? 'var(--a)' : 'var(--r)', borderRadius: 3 }}></div>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--D)', fontSize: 20, color: 'var(--tx)', letterSpacing: '.03em', minWidth: 32, textAlign: 'right' }}>{h.pts}</div>
                    <div style={{ fontSize: 12, color: h.gain > 0 ? 'var(--g)' : 'var(--tx3)', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                      {h.gain > 0 ? `+${h.gain}€` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Changer mdp */}
          <div className="section-lbl">🔐 Sécurité</div>
          <div style={{ margin: '0 16px 14px' }} className="card">
            {!changingPwd ? (
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setChangingPwd(true)}>
                🔑 Changer mon mot de passe
              </button>
            ) : (
              <div>
                <input
                  type="password"
                  className="input"
                  placeholder="Nouveau mot de passe (6 chars min)"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                {pwdMsg && <div style={{ fontSize: 12, color: pwdMsg.startsWith('✅') ? 'var(--g)' : 'var(--r)', marginBottom: 8 }}>{pwdMsg}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1, height: 42, fontSize: 13 }} onClick={handlePwd}>Valider</button>
                  <button className="btn btn-secondary" onClick={() => { setChangingPwd(false); setPwdMsg('') }}>Annuler</button>
                </div>
              </div>
            )}
          </div>

          {/* Déconnexion */}
          <div style={{ margin: '0 16px 32px' }}>
            <button
              onClick={() => signOut(auth)}
              style={{ width: '100%', padding: '14px', background: 'var(--r-dim)', border: '1px solid var(--r-b)', borderRadius: 'var(--R)', color: 'var(--r)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              🚪 Déconnexion
            </button>
          </div>
        </>
      )}
    </div>
  )
}
