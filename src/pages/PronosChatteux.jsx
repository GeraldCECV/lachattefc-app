import { useState, useEffect } from 'react'
import { collections, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'
import TeamLogo from '../components/TeamLogo'

export default function PronosChatteux() {
  const { profil } = useUser()
  const [journee, setJournee] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [pronos, setPronos] = useState({})
  const [missiles, setMissiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Charger journée ouverte ou fermée
      const allSnap = await getDocs(query(collection(db,'journees'), orderBy('numero','asc')))
      // Priorité : fermee > ouverte > resultats (la plus récente)
      const fermee = allSnap.docs.filter(d => d.data().statut === 'fermee').pop()
      const ouverte = allSnap.docs.filter(d => d.data().statut === 'ouverte').pop()
      const resultats = allSnap.docs.filter(d => d.data().statut === 'resultats').pop()
      const jDoc = fermee || ouverte || resultats
      if (!jDoc) { setLoading(false); return }

      const j = { id: jDoc.id, ...jDoc.data() }
      setJournee(j)

      // Charger joueurs
      const joueursSnap = await getDocs(collection(db,'joueurs'))
      const joueursData = joueursSnap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (a.nom||'').localeCompare(b.nom||''))
      setJoueurs(joueursData)

      // Charger pronos + missiles seulement si journée fermée ou résultats
      if (j.statut === 'fermee' || j.statut === 'resultats') {
        const pronosSnap = await getDocs(collection(db,'journees',jDoc.id,'pronos'))
        const pronosData = {}
        pronosSnap.docs.forEach(d => { pronosData[d.id] = d.data() })
        setPronos(pronosData)

        const missilesSnap = await getDocs(collection(db,'journees',jDoc.id,'missiles'))
        setMissiles(missilesSnap.docs.map(d => ({ id:d.id, ...d.data() })))
      }

      setLoading(false)
    }
    load()
  }, [])

  const getProno = (uid, matchKey) => {
    const p = pronos[uid]
    if (!p) return null
    // Vérifier si missile appliqué sur ce match
    const missile = missiles.find(m => m.cible === uid && m.matchKey === matchKey && m.applique)
    if (missile) return { val: missile.pronoImpose, isMissile: true }
    if (matchKey === 'scorer') return p.scorer !== undefined ? { val: p.scorer } : null
    if (matchKey === 'euro') return p.euro ? { val: p.euro } : null
    const idx = parseInt(matchKey.replace('l1_',''))
    return p.matchesL1?.[idx] ? { val: p.matchesL1[idx] } : null
  }

  const getMatchLabel = (key) => {
    if (!journee) return key
    if (key === 'scorer') {
      const m = journee.matchScorer
      return m?.dom ? `${m.dom} — ${m.ext}` : 'Scorer'
    }
    if (key === 'euro') {
      const m = journee.matchEuro
      return m?.dom ? `${m.dom} — ${m.ext}` : 'Euro'
    }
    const idx = parseInt(key.replace('l1_',''))
    const m = journee.matchesL1?.[idx]
    return m?.dom ? `${m.dom} — ${m.ext}` : key
  }

  const matchKeys = journee ? [
    'scorer',
    ...(journee.matchesL1||[]).map((_,i) => `l1_${i}`).filter((_,i) => journee.matchesL1[i]?.dom),
    ...(journee.matchEuro?.dom ? ['euro'] : []),
  ] : []

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div className="spinner" style={{ width:28, height:28 }} />
    </div>
  )

  if (!journee) return (
    <div className="empty-state" style={{ padding:60 }}>
      <div className="empty-state-icon">📋</div>
      <div className="empty-state-title">Aucune journée active</div>
    </div>
  )

  if (journee.statut === 'ouverte') return (
    <div style={{ padding:24, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <div style={{ fontFamily:'var(--D)', fontSize:28, letterSpacing:'.04em', marginBottom:8 }}>
        Pronos secrets
      </div>
      <div style={{ fontSize:13, color:'var(--tx3)', lineHeight:1.7, maxWidth:280, margin:'0 auto' }}>
        Les pronos des autres chatteux seront visibles après la deadline de J{journee.numero}.
      </div>
      {journee.deadline && (
        <div style={{ marginTop:16, padding:'10px 16px', background:'rgba(155,226,45,.06)', border:'1px solid var(--g-b)', borderRadius:'var(--Rs)', fontSize:13, color:'var(--g)', fontWeight:700, display:'inline-block' }}>
          ⏰ Deadline : {new Date(journee.deadline.seconds*1000).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' })} à 23h
        </div>
      )}
    </div>
  )

  return (
    <div style={{ padding:'16px 0 24px' }}>
      <div style={{ padding:'0 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="page-title" style={{ fontSize:28 }}>Pronos J{journee.numero}</div>
          <div style={{ fontSize:12, color:'var(--tx3)', marginTop:2 }}>
            {Object.keys(pronos).length} / {joueurs.length} joueurs
          </div>
        </div>
        <span className={`pill ${journee.statut==='resultats'?'pill-g':'pill-a'}`}>
          {journee.statut==='resultats'?'🏁 Résultats':'🔒 Fermée'}
        </span>
      </div>

      {/* Par joueur */}
      {joueurs.map(j => {
        const p = pronos[j.id]
        const isMe = j.id === profil?.id
        const hasProno = !!p
        const myMissiles = missiles.filter(m => m.lanceur === j.id)

        return (
          <div key={j.id} style={{
            margin:'0 16px 12px',
            background: isMe ? 'rgba(155,226,45,.06)' : 'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))',
            border: `1px solid ${isMe ? 'var(--g-b)' : 'var(--bd)'}`,
            borderRadius:'var(--R)',
            overflow:'hidden',
          }}>
            {/* Header joueur */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--bd)' }}>
              <div className="av" style={{ width:32, height:32, fontSize:11, background: isMe?'var(--g-dim)':'rgba(255,255,255,.06)', color: isMe?'var(--g)':'var(--tx2)' }}>
                {j.initiales}
              </div>
              <div style={{ flex:1, fontWeight:900, fontSize:14, color: isMe?'var(--g)':'var(--tx)', textTransform:'uppercase', letterSpacing:'.02em' }}>
                {j.nom?.split(' ')[0]} {isMe && <span style={{fontSize:10,color:'var(--tx3)',fontWeight:400,textTransform:'none'}}>(toi)</span>}
              </div>
              {!hasProno && <span className="pill pill-r">ABS</span>}
              {p?.jackpotMatch && <span className="pill pill-a">🎰</span>}
              {p?.dcMatch && <span className="pill pill-p">2️⃣</span>}
              {myMissiles.length > 0 && <span className="pill pill-r">🎯 ×{myMissiles.length}</span>}
            </div>

            {/* Pronos */}
            {hasProno && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, padding:'10px 14px' }}>
                {matchKeys.map(key => {
                  const prono = getProno(j.id, key)
                  const isScorer = key === 'scorer'
                  const isEuro = key === 'euro'
                  const isJP = p?.jackpotMatch === key
                  const isDC = p?.dcMatch === key
                  const m = isScorer ? journee.matchScorer : isEuro ? journee.matchEuro : journee.matchesL1?.[parseInt(key.replace('l1_',''))]

                  return (
                    <div key={key} style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                      padding:'6px 8px', borderRadius:'var(--Rs)',
                      background: prono?.isMissile ? 'rgba(248,113,113,.08)' : isScorer ? 'rgba(96,165,250,.06)' : isEuro ? 'rgba(251,146,60,.06)' : 'rgba(255,255,255,.04)',
                      border: `1px solid ${prono?.isMissile ? 'var(--r-b)' : isScorer ? 'var(--b-b)' : isEuro ? 'var(--o-b)' : 'rgba(255,255,255,.07)'}`,
                      minWidth: 48,
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                        {m?.dom && <TeamLogo name={m.dom} size={14} />}
                        {m?.ext && <TeamLogo name={m.ext} size={14} />}
                      </div>
                      <div style={{
                        fontFamily:'var(--D)', fontSize:18, letterSpacing:'.04em',
                        color: prono?.isMissile ? 'var(--r)' : isJP ? 'var(--a)' : isDC ? 'var(--p)' : isScorer ? 'var(--b)' : 'var(--tx)',
                      }}>
                        {prono ? (isScorer ? `${prono.val?.h ?? '?'}-${prono.val?.a ?? '?'}` : prono.val) : '—'}
                      </div>
                      <div style={{ display:'flex', gap:2 }}>
                        {isJP && <span style={{fontSize:8,color:'var(--a)'}}>🎰</span>}
                        {isDC && <span style={{fontSize:8,color:'var(--p)'}}>2️⃣</span>}
                        {prono?.isMissile && <span style={{fontSize:8,color:'var(--r)'}}>🎯</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
