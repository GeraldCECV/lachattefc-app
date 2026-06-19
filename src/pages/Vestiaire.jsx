import { useState, useEffect } from 'react'
import { collection, getDocs, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'

export default function Vestiaire({ onNavigate }) {
  const { profil } = useUser()
  const [journee, setJournee] = useState(null)
  const [monProno, setMonProno] = useState(null)
  const [topClassement, setTopClassement] = useState([])
  const [countdown, setCountdown] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubJ = null

    const load = async () => {
      // Dernière journée
      const snap = await getDocs(query(collection(db, 'journees'), orderBy('numero', 'desc'), limit(1)))
      if (!snap.empty) {
        const jDoc = snap.docs[0]
        const j = { id: jDoc.id, ...jDoc.data() }
        setJournee(j)

        // Écoute temps réel sur la journée
        unsubJ = onSnapshot(doc(db, 'journees', jDoc.id), (d) => {
          if (d.exists()) setJournee({ id: d.id, ...d.data() })
        })

        // Mon prono
        if (profil) {
          const pronoSnap = await getDocs(collection(db, 'journees', jDoc.id, 'pronos'))
          const monDoc = pronoSnap.docs.find(d => d.id === profil.id)
          if (monDoc) setMonProno(monDoc.data())
        }
      }

      // Top classement général
      const joueursSnap = await getDocs(collection(db, 'joueurs'))
      const joueurs = joueursSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.pointsTotal || 0) - (a.pointsTotal || 0))
        .slice(0, 5)
      setTopClassement(joueurs)
      setLoading(false)
    }

    load()
    return () => { if (unsubJ) unsubJ() }
  }, [profil])

  // Countdown
  useEffect(() => {
    if (!journee?.deadline) return
    const tick = () => {
      const dl = new Date(journee.deadline.seconds * 1000)
      const diff = Math.max(0, dl - new Date())
      if (diff === 0) { setCountdown({ expired: true }); return }
      const j = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown({ j, h, m, s, expired: false })
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [journee])

  const deadline = journee?.deadline ? new Date(journee.deadline.seconds * 1000) : null
  const isOpen = journee?.statut === 'ouverte' && deadline && new Date() < deadline
  const isClosed = journee?.statut === 'fermee' || (deadline && new Date() > deadline && journee?.statut !== 'resultats')
  const isResultats = journee?.statut === 'resultats'

  const COLORS = [
    ['rgba(255,215,0,.15)','#FFD700'],['rgba(192,192,192,.12)','#C0C0C0'],
    ['rgba(205,127,50,.12)','#CD7F32'],['rgba(96,165,250,.12)','var(--b)'],
    ['rgba(34,197,94,.12)','var(--g)'],
  ]

  return (
    <div className="scroll-area">
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--D)', fontSize: 28, letterSpacing: '.04em', color: 'var(--tx)', lineHeight: 1 }}>
            😼 Vestiaire
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 3 }}>
            Salut {profil?.nom?.split(' ')[0] || profil?.initiales} 👋
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Saison</div>
          <div style={{ fontFamily: 'var(--D)', fontSize: 22, color: 'var(--g)', letterSpacing: '.04em', lineHeight: 1 }}>25/26</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 24, height: 24 }}></div>
        </div>
      ) : (
        <>
          {/* Status banner */}
          {journee && (
            <div style={{ margin: '0 16px 12px' }}>
              {isOpen && (
                <div style={{
                  background: monProno
                    ? 'linear-gradient(135deg, rgba(34,197,94,.08), rgba(34,197,94,.04))'
                    : 'linear-gradient(135deg, rgba(245,158,11,.08), rgba(245,158,11,.04))',
                  border: `1px solid ${monProno ? 'var(--g-b)' : 'var(--a-b)'}`,
                  borderRadius: 'var(--R)', padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--D)', fontSize: 22, letterSpacing: '.04em', color: 'var(--tx)' }}>
                        Journée {journee.numero}
                      </div>
                      <div style={{ fontSize: 12, color: monProno ? 'var(--g)' : 'var(--a)', fontWeight: 600, marginTop: 2 }}>
                        {monProno ? '✅ Pronos envoyés' : '⏰ Pronos en attente'}
                      </div>
                    </div>
                    {!monProno && (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '7px 14px' }}
                        onClick={() => onNavigate('pronos')}
                      >
                        Jouer →
                      </button>
                    )}
                  </div>
                  {/* Countdown */}
                  {!countdown.expired && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                        Fermeture dans
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { val: countdown.j, lbl: 'J' },
                          { val: countdown.h, lbl: 'H' },
                          { val: countdown.m, lbl: 'M' },
                          { val: countdown.s, lbl: 'S' },
                        ].map(({ val, lbl }) => (
                          <div key={lbl} style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--D)', fontSize: 24, letterSpacing: '.04em', color: 'var(--a)', lineHeight: 1 }}>
                              {String(val ?? 0).padStart(2, '0')}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--tx3)', fontWeight: 700, marginTop: 2 }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isClosed && !isResultats && (
                <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid var(--r-b)', borderRadius: 'var(--R)', padding: '16px' }}>
                  <div style={{ fontFamily: 'var(--D)', fontSize: 22, letterSpacing: '.04em', color: 'var(--r)', marginBottom: 4 }}>
                    🔒 J{journee.numero} — Fermée
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                    {monProno ? 'Tes pronos sont enregistrés. Résultats bientôt !' : 'Tu étais absent cette journée. −1pt J suivante.'}
                  </div>
                </div>
              )}

              {isResultats && (
                <div style={{ background: 'rgba(96,165,250,.06)', border: '1px solid var(--b-b)', borderRadius: 'var(--R)', padding: '16px' }}>
                  <div style={{ fontFamily: 'var(--D)', fontSize: 22, letterSpacing: '.04em', color: 'var(--b)', marginBottom: 4 }}>
                    🏁 J{journee.numero} — Résultats
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                    {journee.pointsJoueurs?.[profil?.id] !== undefined
                      ? `Tu as marqué ${journee.pointsJoueurs[profil.id]} pts cette journée`
                      : 'Les résultats sont disponibles'}
                  </div>
                  <button className="btn btn-secondary" style={{ marginTop: 10, fontSize: 12, padding: '7px 14px' }} onClick={() => onNavigate('classement')}>
                    Voir le classement →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Top 5 classement général */}
          <div className="section-lbl">🏆 Classement général</div>
          <div style={{ margin: '0 16px 12px' }} className="card">
            {topClassement.map((j, idx) => {
              const [bg, color] = COLORS[idx] || ['var(--bg3)', 'var(--tx2)']
              const isMe = j.id === profil?.id
              return (
                <div key={j.id} className="match-row" style={isMe ? { background: 'var(--g-dim)', borderRadius: 8, padding: '10px 8px', margin: '0 -8px' } : {}}>
                  <div style={{ width: 24, textAlign: 'center', fontSize: idx < 3 ? 18 : 13, fontWeight: 700, color: idx < 3 ? color : 'var(--tx3)', flexShrink: 0 }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <div className="av" style={{ width: 30, height: 30, background: isMe ? 'var(--g-dim)' : bg, color: isMe ? 'var(--g)' : color, fontSize: 10 }}>
                    {j.initiales}
                  </div>
                  <div className="match-info">
                    <div className="match-name" style={{ color: isMe ? 'var(--g)' : 'var(--tx)' }}>
                      {j.nom?.split(' ')[0]} {isMe ? '(toi)' : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--D)', fontSize: 20, letterSpacing: '.03em', color: isMe ? 'var(--g)' : 'var(--tx)' }}>
                    {j.pointsTotal || 0}
                  </div>
                </div>
              )
            })}
            <button
              style={{ width: '100%', marginTop: 12, padding: '10px', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 'var(--Rs)', color: 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              onClick={() => onNavigate('classement')}
            >
              Voir le classement complet →
            </button>
          </div>

          {/* Programme journée */}
          {journee?.matchesL1?.length > 0 && (
            <>
              <div className="section-lbl">📋 Programme J{journee.numero}</div>
              <div style={{ margin: '0 16px 16px' }} className="card">
                {/* Scorer */}
                {journee.matchScorer?.dom && (
                  <div className="match-row">
                    <div className="match-info">
                      <div className="match-name">
                        🎯 {journee.matchScorer.dom} — {journee.matchScorer.ext}
                        <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--b-dim)', color: 'var(--b)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>SCORER</span>
                      </div>
                      <div className="match-time">L1 · {journee.matchScorer.jour} {journee.matchScorer.heure}</div>
                    </div>
                    {journee.resultats?.scorer && (
                      <div style={{ fontFamily: 'var(--D)', fontSize: 18, color: 'var(--g)', letterSpacing: '.04em' }}>
                        {journee.resultats.scorer.h}—{journee.resultats.scorer.a}
                      </div>
                    )}
                  </div>
                )}
                {/* 3 premiers matchs L1 */}
                {journee.matchesL1.slice(0, 3).map((m, i) => m?.dom && (
                  <div key={i} className="match-row">
                    <div className="match-info">
                      <div className="match-name">{m.dom} — {m.ext}</div>
                      <div className="match-time">L1 · {m.jour} {m.heure}</div>
                    </div>
                    {journee.resultats?.[`l1_${i}`] && (
                      <div style={{ fontFamily: 'var(--D)', fontSize: 18, color: 'var(--g)', letterSpacing: '.04em' }}>
                        {journee.resultats[`l1_${i}`].h}—{journee.resultats[`l1_${i}`].a}
                      </div>
                    )}
                  </div>
                ))}
                {/* Match euro */}
                {journee.matchEuro?.dom && (
                  <div className="match-row">
                    <div className="match-info">
                      <div className="match-name">
                        🌍 {journee.matchEuro.dom} — {journee.matchEuro.ext}
                        <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--o-dim)', color: 'var(--o)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{journee.matchEuro.ligue || 'EURO'}</span>
                      </div>
                      <div className="match-time">{journee.matchEuro.jour} {journee.matchEuro.heure}</div>
                    </div>
                    {journee.resultats?.euro && (
                      <div style={{ fontFamily: 'var(--D)', fontSize: 18, color: 'var(--g)', letterSpacing: '.04em' }}>
                        {journee.resultats.euro.h}—{journee.resultats.euro.a}
                      </div>
                    )}
                  </div>
                )}
                {journee.matchesL1.filter(m => m?.dom).length > 3 && (
                  <div style={{ paddingTop: 10, fontSize: 12, color: 'var(--tx3)', textAlign: 'center' }}>
                    + {journee.matchesL1.filter(m => m?.dom).length - 3} autres matchs L1
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
