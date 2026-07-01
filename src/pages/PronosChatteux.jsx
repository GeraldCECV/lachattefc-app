import { translateTeam } from '../utils/teamName'
import { useState, useEffect } from 'react'
import { collection, getDocs, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'
import TeamLogo from '../components/TeamLogo'

export default function PronosChatteux() {
  const { profil } = useUser()
  const [journeesList, setJourneesList] = useState([])
  const [selectedJId, setSelectedJId] = useState(null)
  const [journee, setJournee] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [pronos, setPronos] = useState({})
  const [missiles, setMissiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const allSnap = await getDocs(query(collection(db,'journees'), orderBy('numero','asc')))
        const disponibles = allSnap.docs.filter(d => {
          const data = d.data()
          return ['fermee','resultats','ouverte'].includes(data.statut)
        })
        const liste = disponibles.map(d => ({ id:d.id, ...d.data() }))
        const joueursSnap = await getDocs(collection(db,'joueurs'))
        setJoueurs(joueursSnap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (a.nom||'').localeCompare(b.nom||'')))
        setJourneesList(liste)
        if (liste.length > 0) setSelectedJId(liste[liste.length - 1].id)
        setLoading(false)
      } catch(e) {
        console.error(e)
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedJId) return
    let unsub = null
    const load = async () => {
      const pronosSnap = await getDocs(collection(db,'journees',selectedJId,'pronos'))
      const pronosData = {}
      pronosSnap.docs.forEach(d => { pronosData[d.id] = d.data() })
      setPronos(pronosData)
      const missilesSnap = await getDocs(collection(db,'journees',selectedJId,'missiles'))
      setMissiles(missilesSnap.docs.map(d => ({ id:d.id, ...d.data() })))
      unsub = onSnapshot(doc(db,'journees',selectedJId), d => {
        if (!d.exists()) return
        setJournee({ id:d.id, ...d.data() })
      })
    }
    load()
    return () => { if (unsub) unsub() }
  }, [selectedJId])

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

  const deadlinePassed = journee.deadline ? new Date(journee.deadline.seconds * 1000) < new Date() : false
  if (journee.statut === 'ouverte' && !deadlinePassed) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:32, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🐱</div>
      <div style={{ fontFamily:'var(--D)', fontSize:22, letterSpacing:'.04em', marginBottom:12 }}>Espèce de chat de la casse...</div>
      <div style={{ fontSize:13, color:'var(--tx3)', lineHeight:1.7, maxWidth:280, margin:'0 auto' }}>
        Tu vas attendre la deadline comme tout le monde pour voir les pronos de tes amis chatteux.
      </div>
      {journee?.deadline && (
        <div style={{ marginTop:16, padding:'10px 16px', background:'rgba(155,226,45,.06)', border:'1px solid var(--g-b)', borderRadius:'var(--Rs)', fontSize:13, color:'var(--g)', fontWeight:700, display:'inline-block' }}>
          ⏰ Deadline : {new Date(journee.deadline.seconds*1000).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' })} à {new Date(journee.deadline.seconds*1000).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Paris' })}
        </div>
      )}
    </div>
  )

  const isCDM = journee.type === 'cdm'
  const scorer = journee.matchScorer
  const matchesMain = isCDM
    ? (journee.matchesCDM || []).filter(m => m?.dom)
    : (journee.matchesL1 || []).filter(m => m?.dom)
  const euro = journee.matchEuro?.dom ? journee.matchEuro : null

  // Construire la liste des matchs à afficher
  const matchBlocks = [
    scorer?.dom ? { key:'scorer', dom: scorer.dom, ext: scorer.ext, isScorer: true, label: '⚽ Match Scorer' } : null,
    ...matchesMain.map((m, i) => ({ key: isCDM ? `cdm_${i}` : `l1_${i}`, dom: m.dom, ext: m.ext, label: `Match ${i+1}`, isMatchScorer: m.scorer === true })),
    euro ? { key:'euro', dom: euro.dom, ext: euro.ext, isEuro: true, label: '🌍 Match Euro' } : null,
  ].filter(Boolean)

  const getProno = (uid, key) => {
    const p = pronos[uid]
    if (!p) return null
    const missile = missiles.find(m => m.cible === uid && m.matchKey === key && m.applique)
    if (missile) return { val: missile.pronoImpose, isMissile: true }
    if (key === 'scorer') return p.matchScorer ? { val: p.matchScorer } : null
    if (key === 'euro') return p.matchEuro ? { val: p.matchEuro } : null
    const idx = parseInt(key.replace(isCDM ? 'cdm_' : 'l1_', ''))
    const arr = isCDM ? p.matchesCDM : p.matchesL1
    if (arr?.[idx]) return { val: arr[idx] }
    // Pas de prono de base mais DC active sur ce match — afficher les choix DC
    if (p.dcMatch === key && p.dcChoices?.length > 0) return { val: p.dcChoices.join('/'), isDcOnly: true }
    return null
  }

  const getCorrect = (uid, key, isScorer) => {
    const prono = getProno(uid, key)
    const res = journee.resultats?.[key]
    if (!prono || !res || (res.status !== 'FINISHED' && res.status !== 'IN_PLAY' && res.status !== 'PAUSED')) return null
    const rh = parseInt(res.h), ra = parseInt(res.a)
    if (isScorer || journee.scorerOnly || matchBlocks.find(b => b.key === key)?.isMatchScorer) {
      const [ph, pa] = (prono.val || '').split('-').map(Number)
      if (ph === rh && pa === ra) return 'exact'
      if ((ph - pa) === (rh - ra)) return 'ecart'
      return Math.sign(ph - pa) === Math.sign(rh - ra) ? 'issue' : 'wrong'
    }
    const issue = rh > ra ? '1' : rh < ra ? '2' : 'N'
    return prono.val === issue ? 'correct' : 'wrong'
  }

  const getPtsMatch = (uid, key, isScorer) => {
    if (journee.statut !== 'resultats' && journee.statut !== 'fermee') return null
    const prono = getProno(uid, key)
    const res = journee.resultats?.[key]
    if (!prono || !res || (res.status !== 'FINISHED' && res.status !== 'IN_PLAY' && res.status !== 'PAUSED')) return null
    const rh = parseInt(res.h), ra = parseInt(res.a)
    const p = pronos[uid]
    if (isScorer || journee.scorerOnly || matchBlocks.find(b => b.key === key)?.isMatchScorer) {
      const [ph, pa] = (prono.val || '').split('-').map(Number)
      if (ph === rh && pa === ra) return 3
      if ((ph - pa) === (rh - ra)) return 2
      return Math.sign(ph - pa) === Math.sign(rh - ra) ? 1 : 0
    }
    const issue = rh > ra ? '1' : rh < ra ? '2' : 'N'
    if (prono.val !== issue) return 0
    const bonCount = Object.keys(pronos).filter(u => getProno(u, key)?.val === issue).length
    const allTotal = Object.keys(pronos).length
    const ratio = allTotal > 0 ? bonCount / allTotal : 1
    let pts = ratio <= 0.25 ? 2 : 1
    if (p?.jackpotMatch === key) pts *= 2
    return pts
  }

  const getBonusLabel = (uid, key) => {
    const p = pronos[uid]
    if (!p) return null
    if (p.jackpotMatch === key) return { icon: '🎰', label: 'Jackpot' }
    if (p.dcMatch === key) return { icon: '2️⃣', label: 'DC' }
    return null
  }

  // Trier joueurs : ceux qui ont proné en premier, ABS en bas
  const joueursTriés = [...joueurs].sort((a, b) => {
    const aHas = !!pronos[a.id]
    const bHas = !!pronos[b.id]
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    return 0
  })

  return (
    <div style={{ padding:'16px 0 32px' }}>
      {/* Header */}
      <div style={{ padding:'0 16px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="page-title" style={{ fontSize:26 }}>Pronos J{journee.numero}</div>
          <div style={{ fontSize:12, color:'var(--tx3)', marginTop:2 }}>{Object.keys(pronos).length} / {joueurs.length} joueurs</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {journeesList.length > 1 && (
            <select value={selectedJId} onChange={e => setSelectedJId(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:'var(--Rs)', border:'1px solid var(--bd)', background:'var(--bg3)', color:'var(--tx)', fontSize:13, fontWeight:900, cursor:'pointer' }}>
              {journeesList.map(j => (
                <option key={j.id} value={j.id}>J{j.numero}</option>
              ))}
            </select>
          )}
          <span className={`pill ${journee.statut==='resultats'?'pill-g':'pill-a'}`}>
            {journee.statut==='resultats'?'🏁 Résultats':'🔒 Fermée'}
          </span>
        </div>
      </div>

      {/* Blocs par match */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'0 12px' }}>
        {matchBlocks.map(match => {
          const res = journee.resultats?.[match.key]
          const hasScore = res && (res.status === 'FINISHED' || res.status === 'IN_PLAY' || res.status === 'PAUSED') && res.h !== null && res.a !== null
          const isLive = res?.status === 'IN_PLAY' || res?.status === 'PAUSED'

          return (
            <div key={match.key} style={{
              borderRadius:'var(--R)',
              border: `1px solid ${match.isScorer ? 'rgba(96,165,250,.15)' : match.isEuro ? 'rgba(251,146,60,.15)' : 'var(--bd)'}`,
              overflow:'hidden',
              background:'var(--bg2)',
            }}>
              {/* Header match */}
              <div style={{
                padding:'10px 14px',
                background: match.isScorer ? 'rgba(96,165,250,.06)' : match.isEuro ? 'rgba(251,146,60,.06)' : 'rgba(255,255,255,.03)',
                borderBottom:'1px solid var(--bd)',
                display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:8,
              }}>
                {/* Équipes */}
                <div style={{ display:'flex', alignItems:'center', gap:6, flex:'1 1 auto', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                    <TeamLogo name={match.dom} size={20} />
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--tx2)', textTransform:'uppercase', letterSpacing:'.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {translateTeam(match.dom)}
                    </span>
                  </div>
                  <div style={{ fontSize:10, color:'var(--tx3)', fontWeight:700, flexShrink:0 }}>vs</div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                    <TeamLogo name={match.ext} size={20} />
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--tx2)', textTransform:'uppercase', letterSpacing:'.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {translateTeam(match.ext)}
                    </span>
                  </div>
                  {isLive && (
                    <div style={{
                      display:'flex', alignItems:'center', gap:3, flexShrink:0,
                      padding:'2px 6px', borderRadius:20,
                      background:'rgba(248,68,68,.15)', border:'1px solid rgba(248,68,68,.4)',
                      fontSize:9, fontWeight:900, color:'#FF4444', letterSpacing:'.06em',
                      animation:'pulse 1.5s infinite',
                    }}>
                      <span style={{ width:4, height:4, borderRadius:'50%', background:'#FF4444', display:'inline-block' }} />
                      LIVE
                    </div>
                  )}
                </div>

                {/* Score */}
                {hasScore ? (
                  <div style={{
                    fontFamily:'var(--D)', fontSize:18, fontWeight:900, letterSpacing:'.04em',
                    color: isLive ? 'var(--tx)' : 'var(--tx)',
                    padding:'4px 9px', borderRadius:'var(--Rs)', flexShrink:0,
                    background: isLive ? 'rgba(155,226,45,.08)' : 'rgba(255,255,255,.05)',
                    border: `1px solid ${isLive ? 'var(--g-b)' : 'var(--bd)'}`,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
                      {isLive && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--g)', display:'inline-block', flexShrink:0 }} />}
                      {res.h} - {res.a}
                    </div>
                    {isLive && res.elapsed !== undefined && res.elapsed !== null && (
                      <div style={{ fontSize:11, color:'var(--g)', fontWeight:700, lineHeight:1 }}>
                        {res.status === 'PAUSED' ? 'Mi-temps' : `${res.elapsed}'`}
                      </div>
                    )}
                    {res.status === 'FINISHED' && (
                      <div style={{ fontSize:10, fontWeight:900, letterSpacing:'.06em', color:'var(--tx3)', lineHeight:1 }}>Terminé</div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:900, letterSpacing:'.06em',
                    background:'rgba(255,255,255,.05)', border:'1px solid var(--bd)',
                    color:'var(--tx3)',
                  }}>
                    À venir
                  </div>
                )}
              </div>

              {/* Lignes joueurs */}
              <div>
                {joueursTriés.map((j, idx) => {
                  const isMe = j.id === profil?.id
                  const prono = getProno(j.id, match.key)
                  const correct = getCorrect(j.id, match.key, match.isScorer)
                  const pts = getPtsMatch(j.id, match.key, match.isScorer)
                  const bonus = getBonusLabel(j.id, match.key)
                  const missile = missiles.find(m => m.cible === j.id && m.matchKey === match.key)
                  const missileLance = missiles.find(m => m.lanceur === j.id && m.matchKey === match.key)
                  const hasProno = !!pronos[j.id]

                  // Couleur bg ligne
                  const bgLine = isMe
                    ? 'rgba(155,226,45,.05)'
                    : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.01)'

                  return (
                    <div key={j.id} style={{
                      display:'flex', alignItems:'center',
                      padding:'7px 14px',
                      borderBottom:'1px solid rgba(255,255,255,.03)',
                      background: bgLine,
                      gap:8,
                    }}>
                      {/* Avatar + nom */}
                      <div style={{ display:'flex', alignItems:'center', gap:7, flex:1, minWidth:0 }}>
                        <div className="av" style={{
                          width:26, height:26, fontSize:9, flexShrink:0,
                          background: isMe ? 'var(--g-dim)' : 'rgba(255,255,255,.06)',
                          color: isMe ? 'var(--g)' : 'var(--tx3)',
                        }}>
                          {j.initiales}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:900, color: isMe ? 'var(--g)' : 'var(--tx)', textTransform:'uppercase', letterSpacing:'.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {j.nom?.split(' ')[0]}
                          </div>
                          {!hasProno && <div style={{ fontSize:9, color:'var(--r)', fontWeight:900, lineHeight:1 }}>ABS</div>}
                        </div>
                      </div>

                      {/* Prono + bonus + missile */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        {/* Pastilles bonus/missile à gauche */}
                        <div style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'flex-end' }}>
                          {bonus && (
                            <div style={{
                              display:'flex', alignItems:'center', gap:3,
                              padding:'2px 6px', borderRadius:20,
                              background: bonus.icon === '🎰' ? 'rgba(255,200,0,.12)' : 'rgba(96,165,250,.12)',
                              border: `1px solid ${bonus.icon === '🎰' ? 'rgba(255,200,0,.3)' : 'rgba(96,165,250,.3)'}`,
                              fontSize:10, fontWeight:700,
                              color: bonus.icon === '🎰' ? '#FFD700' : 'var(--b)',
                            }}>
                              {bonus.icon} {bonus.label}
                            </div>
                          )}
                          {missile ? (
                            <div style={{
                              display:'flex', alignItems:'center', gap:3,
                              padding:'2px 6px', borderRadius:20,
                              background:'rgba(248,68,68,.12)',
                              border:'1px solid rgba(248,68,68,.3)',
                              fontSize:10, fontWeight:700, color:'#FF4444',
                            }}>
                              🚀 {joueurs.find(u => u.id === missile.lanceur)?.nom?.split(' ')[0] || '?'}
                            </div>
                          ) : missileLance ? (
                            <div style={{
                              display:'flex', alignItems:'center', gap:3,
                              padding:'2px 6px', borderRadius:20,
                              background:'rgba(251,146,60,.12)',
                              border:'1px solid rgba(251,146,60,.3)',
                              fontSize:10, fontWeight:700, color:'var(--o)',
                            }}>
                              ↗ {joueurs.find(u => u.id === missileLance.cible)?.nom?.split(' ')[0] || '?'}
                            </div>
                          ) : null}
                        </div>
                        {/* Prono + points en dessous */}
                        {prono ? (
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                            <div style={{
                              fontFamily:'var(--D)', fontSize:18, fontWeight:900, letterSpacing:'.04em',
                              minWidth:42, textAlign:'center',
                              padding:'4px 8px', borderRadius:'var(--Rs)',
                              color: correct === 'exact' ? '#FFD700' : correct === 'ecart' ? '#9BE22D' : correct === 'correct' ? '#9BE22D' : correct === 'issue' ? '#FB923C' : correct === 'wrong' ? '#FF4444' : prono.isMissile ? '#FF4444' : match.isScorer ? 'var(--b)' : 'var(--tx)',
                              background: correct === 'exact' ? 'rgba(255,200,0,.18)' : correct === 'ecart' || correct === 'correct' ? 'rgba(155,226,45,.18)' : correct === 'issue' ? 'rgba(251,146,60,.18)' : correct === 'wrong' ? 'rgba(255,68,68,.18)' : 'rgba(255,255,255,.04)',
                              border: `1px solid ${correct === 'exact' ? 'rgba(255,200,0,.6)' : correct === 'ecart' || correct === 'correct' ? 'rgba(155,226,45,.5)' : correct === 'issue' ? 'rgba(251,146,60,.5)' : correct === 'wrong' ? 'rgba(255,68,68,.5)' : 'rgba(255,255,255,.06)'}`,
                            }}>
                              {prono.val}
                            </div>
                            {pts !== null && (
                              <div style={{
                                fontSize:13, fontWeight:900, lineHeight:1,
                                color: pts === 0 ? 'var(--tx3)' : pts >= 3 ? '#FFD700' : 'var(--g)',
                              }}>
                                +{pts} pt{pts > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ minWidth:42, textAlign:'center', color:'var(--bd2)', fontSize:16 }}>—</div>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}




