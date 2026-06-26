import { useState, useEffect } from 'react'
import { collection, getDocs, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'
import TeamLogo from '../components/TeamLogo'

const COLORS = [
  ['rgba(255,215,0,.14)','#FFD700'],['rgba(192,192,192,.12)','#C0C0C0'],
  ['rgba(205,127,50,.12)','#CD7F32'],['rgba(96,165,250,.12)','#93C5FD'],
  ['rgba(155,226,45,.12)','#9BE22D'],
]

export default function Vestiaire({ onNavigate, onProfil, profil: profilProp }) {
  const { profil } = useUser()
  const [journee, setJournee] = useState(null)
  const [monProno, setMonProno] = useState(null)
  const [topClassement, setTopClassement] = useState([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    let unsubJ = null
    setMonProno(null)
    const load = async () => {
      // Charger la première journée ouverte ou en cours
      const allSnap = await getDocs(query(collection(db,'journees'), orderBy('numero','asc')))
      const now = new Date()
      const openDocs = allSnap.docs.filter(d => {
        const data = d.data()
        if (data.statut === 'resultats') return false
        const dl = data.deadline ? new Date(data.deadline.seconds * 1000) : null
        return data.statut === 'ouverte' || data.statut === 'fermee'
      })
      const snap = { docs: openDocs.length > 0 ? [openDocs[0]] : allSnap.docs.slice(-1), empty: allSnap.empty }
      if (!snap.empty) {
        const jDoc = snap.docs[0]
        unsubJ = onSnapshot(doc(db,'journees',jDoc.id), async d => {
          if (!d.exists()) return
          const jData = { id:d.id, ...d.data() }
          setJournee(jData)

          // Classement live depuis pointsJoueurs (même source que Classement)
          const joueursSnap = await getDocs(collection(db,'joueurs'))
          const joueurs = joueursSnap.docs.map(j => ({ id:j.id, ...j.data() }))
          const pts = jData.pointsJoueurs || {}
          const penalites = jData.penalites || {}
          const BAREME = [24, 16, 12, 9, 7, 5, 4, 3, 0]

          const ptsAvecPenalites = {}
          joueurs.forEach(j => {
            ptsAvecPenalites[j.id] = (pts[j.id] || 0) + (penalites[j.id] || 0)
          })
          const hasSomePoints = Object.values(pts).some(p => p > 0)

          const sorted = joueurs
            .map(j => ({ ...j, ptsJ: ptsAvecPenalites[j.id] || 0 }))
            .sort((a,b) => b.ptsJ - a.ptsJ)

          // Partage des gains en cas d'égalité
          let ei = 0
          while (ei < sorted.length) {
            const epts = sorted[ei].ptsJ
            let fin = ei
            while (fin < sorted.length && sorted[fin].ptsJ === epts) fin++
            let gainPartage = 0
            for (let r = ei; r < fin; r++) gainPartage += BAREME[r] || 0
            const gainParJoueur = hasSomePoints ? Math.round(gainPartage / (fin - ei) * 100) / 100 : 0
            for (let k = ei; k < fin; k++) sorted[k] = { ...sorted[k], gainJ: gainParJoueur }
            ei = fin
          }

          setTopClassement(sorted.slice(0,5))
        })
        if (profil) {
          setMonProno(null)
          const pronosSnap = await getDocs(collection(db,'journees',jDoc.id,'pronos'))
          console.log('🔍 pronos J docs:', pronosSnap.docs.map(d => d.id))
          console.log('🔍 profil.id:', profil.id)
          const monDoc = pronosSnap.docs.find(d => d.id === profil.id)
          console.log('🔍 monDoc trouvé:', !!monDoc)
          if (monDoc) setMonProno(monDoc.data())
        }
      }
      setLoading(false)
    }
    load()
    return () => { if (unsubJ) unsubJ() }
  }, [profil])

  useEffect(() => {
    if (!journee?.deadline) return
    const tick = () => {
      const dl = new Date(journee.deadline.seconds*1000)
      const diff = Math.max(0, dl - new Date())
      if (diff === 0) { setCountdown({ expired:true }); return }
      setCountdown({ j:Math.floor(diff/86400000), h:Math.floor((diff%86400000)/3600000), m:Math.floor((diff%3600000)/60000), s:Math.floor((diff%60000)/1000), expired:false })
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [journee])

  const dl = journee?.deadline ? new Date(journee.deadline.seconds*1000) : null
  const isOpen = journee?.statut === 'ouverte' && dl && new Date() < dl
  const isClosed = (journee?.statut === 'fermee') || (dl && new Date() > dl && journee?.statut !== 'resultats')
  const isRes = journee?.statut === 'resultats'
  const prenom = profil?.nom?.split(' ')[0] || profil?.initiales || ''

  return (
    <div className="scroll-area">
      {/* Header */}
      <div style={{ padding:'16px 20px 12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div className="page-title">Vestiaire</div>
          <div className="page-sub">Salut {prenom} 👋</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--tx3)', fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em' }}>Saison</div>
            <div style={{ fontFamily:'var(--D)', fontSize:24, color:'var(--g)', letterSpacing:'.05em', lineHeight:1, textShadow:'0 0 12px rgba(155,226,45,.3)' }}>26/27</div>
          </div>
          {onProfil && (
            <button onClick={onProfil} style={{
              width:36, height:36, borderRadius:'50%', flexShrink:0,
              background:'var(--g-dim)', border:'1px solid var(--g-b)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:900, color:'var(--g)',
              cursor:'pointer', boxShadow:'0 0 10px rgba(155,226,45,.2)',
            }}>
              {(profilProp || profil)?.initiales?.slice(0,2) || '👤'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div className="spinner" style={{ width:24, height:24 }}></div>
        </div>
      ) : (
        <>
          {/* Status banner */}
          {journee && (
            <div style={{ margin:'0 16px 12px' }}>
              {isOpen && (
                <div style={{
                  background: monProno ? 'linear-gradient(135deg, rgba(155,226,45,.08), rgba(155,226,45,.04))' : 'linear-gradient(135deg, rgba(251,191,36,.08), rgba(251,191,36,.04))',
                  border: `1px solid ${monProno ? 'var(--g-b)' : 'var(--a-b)'}`,
                  borderRadius:'var(--R)', padding:'16px',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontFamily:'var(--D)', fontSize:22, letterSpacing:'.04em', textTransform:'uppercase' }}>
                        Journée {journee.numero}
                      </div>
                      <div style={{ fontSize:12, color: monProno?'var(--g)':'var(--a)', fontWeight:900, marginTop:2, textTransform:'uppercase', letterSpacing:'.05em' }}>
                        {monProno ? '✅ Pronos envoyés' : '⏰ Pronos en attente'}
                      </div>
                    </div>
                    {!monProno && (
                      <button className="btn btn-secondary" style={{ fontSize:12, padding:'7px 14px' }} onClick={() => onNavigate('pronos')}>
                        Jouer →
                      </button>
                    )}
                  </div>
                  {!countdown.expired && (
                    <div>
                      <div style={{ fontSize:10, color:'var(--tx3)', fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Fermeture dans</div>
                      <div style={{ display:'flex', gap:8 }}>
                        {[{v:countdown.j,l:'J'},{v:countdown.h,l:'H'},{v:countdown.m,l:'M'},{v:countdown.s,l:'S'}].map(({v,l}) => (
                          <div key={l} style={{ flex:1, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:'8px 4px', textAlign:'center' }}>
                            <div style={{ fontFamily:'var(--D)', fontSize:26, letterSpacing:'.04em', color:'var(--a)', lineHeight:1, textShadow:'0 0 10px rgba(251,191,36,.3)' }}>
                              {String(v??0).padStart(2,'0')}
                            </div>
                            <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:900, marginTop:2, textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {isClosed && !isRes && (
                <div style={{ background:'rgba(248,113,113,.06)', border:'1px solid var(--r-b)', borderRadius:'var(--R)', padding:16 }}>
                  <div style={{ fontFamily:'var(--D)', fontSize:22, letterSpacing:'.04em', color:'var(--r)', marginBottom:4, textTransform:'uppercase' }}>
                    🔒 J{journee.numero} — Fermée
                  </div>
                  <div style={{ fontSize:13, color:'var(--tx2)' }}>
                    {monProno ? 'Tes pronos sont enregistrés. Résultats bientôt !' : 'Tu étais absent cette journée. −1pt J suivante.'}
                  </div>
                </div>
              )}
              {isRes && (
                <div style={{ background:'rgba(96,165,250,.06)', border:'1px solid var(--b-b)', borderRadius:'var(--R)', padding:16 }}>
                  <div style={{ fontFamily:'var(--D)', fontSize:22, letterSpacing:'.04em', color:'var(--b)', marginBottom:4, textTransform:'uppercase' }}>
                    🏁 J{journee.numero} — Résultats
                  </div>
                  <div style={{ fontSize:13, color:'var(--tx2)', marginBottom:10 }}>
                    {journee.pointsJoueurs?.[profil?.id] !== undefined
                      ? `Tu as marqué ${journee.pointsJoueurs[profil.id]} pts cette journée`
                      : 'Les résultats sont disponibles'}
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize:12, padding:'7px 14px' }} onClick={() => onNavigate('classement')}>
                    Voir le classement →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Classement */}
          <div className="section-lbl">⚡ Classement J{journee?.numero} • Live</div>
          <div style={{ margin:'0 16px 12px' }} className="card">
            {topClassement.map((j,idx) => {
              const [bg,color] = COLORS[idx]||['rgba(155,226,45,.1)','var(--g)']
              const isMe = j.id === profil?.id
              return (
                <div key={j.id} className="match-row" style={isMe?{background:'rgba(155,226,45,.06)',borderRadius:10}:{}}>
                  <div style={{ width:26, textAlign:'center', fontSize:idx<3?18:13, fontWeight:900, color:idx<3?color:'var(--tx3)', flexShrink:0 }}>
                    {idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':idx+1}
                  </div>
                  <div className="av" style={{ width:30, height:30, background:isMe?'var(--g-dim)':bg, color:isMe?'var(--g)':color, fontSize:10, border:`1px solid ${isMe?'var(--g-b)':'rgba(255,255,255,.08)'}` }}>
                    {j.initiales}
                  </div>
                  <div className="match-info">
                    <div className="match-name" style={{ color:isMe?'var(--g)':'var(--tx)', fontSize:13 }}>
                      {j.nom?.split(' ')[0]} {isMe?<span style={{fontSize:10,color:'var(--tx3)'}}>（toi）</span>:''}
                    </div>
                    <div style={{ fontSize:11, color:'var(--tx3)' }}>{j.ptsJ || 0} pts</div>
                  </div>
                  <div style={{ fontFamily:'var(--D)', fontSize:22, letterSpacing:'.03em', color: (j.gainJ||0)>0?'var(--g)':'var(--tx3)' }}>
                    {(j.gainJ||0)>0?'+':''}{j.gainJ||0}€
                  </div>
                </div>
              )
            })}
            <button onClick={() => onNavigate('classement')} style={{
              width:'100%', marginTop:12, padding:10,
              background:'rgba(155,226,45,.06)', border:'1px solid var(--g-b)',
              borderRadius:'var(--Rs)', color:'var(--g)', fontSize:12, fontWeight:900,
              cursor:'pointer', textTransform:'uppercase', letterSpacing:'.05em',
            }}>
              Classement complet →
            </button>
          </div>

          {/* Programme */}
          {journee?.matchesL1?.length > 0 && (
            <>
              <div className="section-lbl">📋 Programme J{journee.numero}</div>
              <div style={{ margin:'0 16px 24px' }} className="card">
                {journee.matchScorer?.dom && (
                  <div className="match-row">
                    <div className="match-info">
                      <div className="match-name" style={{ display:'flex', alignItems:'center', gap:6 }}>
                        ⚽ <TeamLogo name={journee.matchScorer.dom} size={20} /> {journee.matchScorer.dom} — {journee.matchScorer.ext} <TeamLogo name={journee.matchScorer.ext} size={20} />
                        <span style={{ marginLeft:6, fontSize:10, background:'var(--b-dim)', color:'#93C5FD', padding:'1px 6px', borderRadius:4, fontWeight:900, border:'1px solid var(--b-b)' }}>À SCORER</span>
                      </div>
                      <div className="match-time">L1 · {journee.matchScorer.jour} {journee.matchScorer.heure}</div>
                    </div>
                    {journee.resultats?.scorer ? (
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'var(--D)', fontSize:20, color: journee.resultats.scorer.status==='IN_PLAY'?'var(--r)':'var(--g)', letterSpacing:'.04em' }}>
                          {journee.resultats.scorer.h}—{journee.resultats.scorer.a}
                        </div>
                        {journee.resultats.scorer.status==='IN_PLAY' && <div className="live"><div className="live-dot"></div>Live</div>}
                      </div>
                    ) : <div style={{ fontSize:12, color:'var(--tx3)' }}>—</div>}
                  </div>
                )}
                {journee.matchesL1.map((m,i) => m?.dom && (
                  <div key={i} className="match-row">
                    <div className="match-info">
                      <div className="match-name" style={{ display:'flex', alignItems:'center', gap:5 }}><TeamLogo name={m.dom} size={18} />{m.dom} — {m.ext}<TeamLogo name={m.ext} size={18} /></div>
                      <div className="match-time">L1 · {m.jour} {m.heure}</div>
                    </div>
                    {journee.resultats?.[`l1_${i}`] && (
                      <div style={{ fontFamily:'var(--D)', fontSize:20, color:'var(--g)', letterSpacing:'.04em' }}>
                        {journee.resultats[`l1_${i}`].h}—{journee.resultats[`l1_${i}`].a}
                      </div>
                    )}
                  </div>
                ))}
                {journee.matchEuro?.dom && (
                  <div className="match-row">
                    <div className="match-info">
                      <div className="match-name" style={{ display:'flex', alignItems:'center', gap:6 }}>
                        🌍 <TeamLogo name={journee.matchEuro.dom} size={18} /> {journee.matchEuro.dom} — {journee.matchEuro.ext} <TeamLogo name={journee.matchEuro.ext} size={18} />
                        <span style={{ marginLeft:6, fontSize:10, background:'var(--o-dim)', color:'#FDBA74', padding:'1px 6px', borderRadius:4, fontWeight:900, border:'1px solid var(--o-b)' }}>{journee.matchEuro.ligue||'EURO'}</span>
                      </div>
                      <div className="match-time">{journee.matchEuro.jour} {journee.matchEuro.heure}</div>
                    </div>
                    {journee.resultats?.euro && (
                      <div style={{ fontFamily:'var(--D)', fontSize:20, color:'var(--g)', letterSpacing:'.04em' }}>
                        {journee.resultats.euro.h}—{journee.resultats.euro.a}
                      </div>
                    )}
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
