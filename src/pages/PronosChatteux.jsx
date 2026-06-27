import { translateTeam } from '../utils/teamName'
import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'
import TeamLogo from '../components/TeamLogo'

export default function PronosChatteux() {
  const { profil } = useUser()
  const [journeesList, setJourneesList] = useState([]) // journées disponibles
  const [selectedJId, setSelectedJId] = useState(null) // journée sélectionnée
  const [journee, setJournee] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [pronos, setPronos] = useState({})
  const [missiles, setMissiles] = useState([])
  const [loading, setLoading] = useState(true)

  // Charger la liste des journées disponibles au montage
  useEffect(() => {
    const load = async () => {
      try {
        const allSnap = await getDocs(query(collection(db,'journees'), orderBy('numero','asc')))
        const now = new Date()
        const disponibles = allSnap.docs.filter(d => {
          const data = d.data()
          if (['fermee','resultats'].includes(data.statut)) return true
          if (data.statut === 'ouverte') return true // inclure toutes les ouvertes
          return false
        })
        const liste = disponibles.map(d => ({ id:d.id, ...d.data() }))

        const joueursSnap = await getDocs(collection(db,'joueurs'))
        setJoueurs(joueursSnap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (a.nom||'').localeCompare(b.nom||'')))

        setJourneesList(liste)
        // Sélectionner la plus récente par défaut
        if (liste.length > 0) setSelectedJId(liste[liste.length - 1].id)
        setLoading(false)
      } catch(e) {
        console.error(e)
        setLoading(false)
      }
    }
    load()
  }, [])

  // Charger pronos/missiles quand la journée sélectionnée change
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

  // Build match columns
  const scorer = journee.matchScorer
  const matchesL1 = (journee.matchesL1 || []).filter(m => m?.dom)
  const euro = journee.matchEuro?.dom ? journee.matchEuro : null
  const isCDM = journee.type === 'cdm'

  const cols = [
    scorer?.dom ? { key:'scorer', label:'⚽', dom: scorer.dom, ext: scorer.ext, isScorer: true } : null,
    ...matchesL1.map((m, i) => ({ key: isCDM ? `cdm_${i}` : `l1_${i}`, label:`#${i+1}`, dom: m.dom, ext: m.ext })),
    euro ? { key:'euro', label:'🌍', dom: euro.dom, ext: euro.ext, isEuro: true } : null,
  ].filter(Boolean)

  // Map joueurs par id pour lookup rapide
  const joueursById = {}
  joueurs.forEach(j => { joueursById[j.id] = j })

  // Nom du match pour affichage missile
  const getMatchName = (key) => {
    if (key === 'scorer') return scorer ? `${translateTeam(scorer.dom)} — ${translateTeam(scorer.ext)}` : key
    if (key === 'euro') return euro ? `${translateTeam(euro.dom)} — ${translateTeam(euro.ext)}` : key
    const prefix = key.startsWith('cdm_') ? 'cdm_' : 'l1_'
    const idx = parseInt(key.replace(prefix,''))
    const m = matchesL1[idx]
    return m ? `${translateTeam(m.dom)} — ${translateTeam(m.ext)}` : key
  }

  const getVal = (uid, key) => {
    const p = pronos[uid]
    if (!p) return null
    const missile = missiles.find(m => m.cible === uid && m.matchKey === key && m.applique)
    if (missile) return { val: missile.pronoImpose, isMissile: true }
    if (key === 'scorer') return p.matchScorer ? { val: p.matchScorer } : null
    if (key === 'euro') return p.matchEuro ? { val: p.matchEuro } : null
    const prefix = key.startsWith('cdm_') ? 'cdm_' : 'l1_'
    const idx = parseInt(key.replace(prefix,''))
    const arr = key.startsWith('cdm_') ? p.matchesCDM : p.matchesL1
    return arr?.[idx] ? { val: arr[idx] } : null
  }

  const hasBonus = (uid, key) => {
    const p = pronos[uid]
    if (!p) return null
    if (p.jackpotMatch === key) return '🎰'
    if (p.dcMatch === key) return '2️⃣'
    return null
  }

  const calcPoints = (uid) => {
    if (journee.statut !== 'resultats') return null
    const p = pronos[uid]
    if (!p) return null
    let pts = 0
    cols.forEach(col => {
      const prono = getVal(uid, col.key)
      const res = journee.resultats?.[col.key]
      if (!prono || !res || (res.status !== 'FINISHED' && res.status !== 'IN_PLAY')) return
      const rh = parseInt(res.h), ra = parseInt(res.a)
      if (col.isScorer) {
        const [ph, pa] = (prono.val || '').split('-').map(Number)
        if (ph === rh && pa === ra) pts += 3
        else if (Math.sign(ph - pa) === Math.sign(rh - ra)) pts += 1
      } else {
        const issue = rh > ra ? '1' : rh < ra ? '2' : 'N'
        if (prono.val === issue) {
          const total = Object.keys(pronos).filter(u => getVal(u, col.key)?.val === issue).length
          const allTotal = Object.keys(pronos).length
          const ratio = allTotal > 0 ? total / allTotal : 1
          let p2 = ratio <= 0.25 ? 2 : 1
          if (p?.jackpotMatch === col.key) p2 *= 2
          pts += p2
        }
      }
    })
    return pts
  }

  return (
    <div style={{ padding:'16px 0 24px' }}>
      {/* Header */}
      <div style={{ padding:'0 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
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

      {/* Tableau scrollable */}
      <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:8 }}>
        <table style={{ borderCollapse:'separate', borderSpacing:0, minWidth: 160 + cols.length * 56 }}>
          {/* Header matchs */}
          <thead>
            <tr>
              <th style={{ position:'sticky', left:0, zIndex:2, background:'#07100C', padding:'8px 12px', textAlign:'left', fontSize:11, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', borderBottom:'1px solid var(--bd)', minWidth:90 }}>
                Joueur
              </th>
              <th style={{ position:'sticky', left:90, zIndex:2, background:'#07100C', padding:'4px 6px', textAlign:'center', borderBottom:'1px solid var(--bd)', fontSize:9, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', minWidth:40 }}>PTS</th>
              {cols.map(col => (
                <th key={col.key} style={{ padding:'4px 2px', textAlign:'center', borderBottom:'1px solid var(--bd)', background: col.isScorer ? 'rgba(96,165,250,.06)' : col.isEuro ? 'rgba(251,146,60,.06)' : 'rgba(0,0,0,.2)', minWidth:50 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <div style={{ display:'flex', gap:1 }}>
                      <TeamLogo name={col.dom} size={14} />
                      <TeamLogo name={col.ext} size={14} />
                    </div>
                    <div style={{ fontSize:9, color: col.isScorer ? 'var(--b)' : col.isEuro ? 'var(--o)' : 'var(--tx3)', fontWeight:900 }}>
                      {col.label}
                    </div>
                  </div>
                </th>
              ))}
              <th style={{ padding:'4px 6px', textAlign:'center', borderBottom:'1px solid var(--bd)', background:'rgba(0,0,0,.2)', fontSize:9, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', minWidth:60 }}>Bonus</th>
              <th style={{ padding:'4px 6px', textAlign:'center', borderBottom:'1px solid var(--bd)', background:'rgba(248,113,113,.04)', fontSize:9, fontWeight:900, color:'var(--r)', textTransform:'uppercase', minWidth:140 }}>🚀 Missile</th>
            </tr>
          </thead>

          {/* Lignes joueurs */}
          <tbody>
            {joueurs.map(j => {
              const isMe = j.id === profil?.id
              const hasProno = !!pronos[j.id]
              const missileLance = missiles.find(m => m.lanceur === j.id)
              const missileRecu = missiles.find(m => m.cible === j.id)
              const pts = calcPoints(j.id)

              return (
                <tr key={j.id}>
                  {/* Nom joueur sticky */}
                  <td style={{
                    position:'sticky', left:0, zIndex:1,
                    background: isMe ? 'rgba(155,226,45,.08)' : '#07100C',
                    padding:'6px 10px', borderBottom:'1px solid rgba(255,255,255,.05)',
                    minWidth:90,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div className="av" style={{ width:24, height:24, fontSize:9, flexShrink:0, background: isMe?'var(--g-dim)':'rgba(255,255,255,.06)', color: isMe?'var(--g)':'var(--tx3)' }}>
                        {j.initiales}
                      </div>
                      <div>
                        <div style={{ fontSize:11, fontWeight:900, color: isMe?'var(--g)':'var(--tx)', textTransform:'uppercase', letterSpacing:'.02em', whiteSpace:'nowrap' }}>
                          {j.nom?.split(' ')[0]}
                        </div>
                        {!hasProno && <div style={{ fontSize:9, color:'var(--r)', fontWeight:900 }}>ABS</div>}
                      </div>
                    </div>
                  </td>

                  {/* Colonne PTS sticky */}
                  <td style={{
                    position:'sticky', left:90, zIndex:1,
                    background: isMe ? 'rgba(155,226,45,.08)' : '#07100C',
                    padding:'4px 6px', borderBottom:'1px solid rgba(255,255,255,.05)',
                    textAlign:'center', verticalAlign:'middle', minWidth:40,
                  }}>
                    {pts !== null ? (
                      <div style={{ fontFamily:'var(--D)', fontSize:16, fontWeight:900, color: pts >= 8 ? '#FFD700' : pts >= 4 ? 'var(--g)' : 'var(--tx)', lineHeight:1 }}>
                        {pts}
                      </div>
                    ) : (
                      <span style={{ color:'var(--bd2)', fontSize:12 }}>—</span>
                    )}
                  </td>

                  {/* Cellules pronos */}
                  {cols.map(col => {
                    const prono = getVal(j.id, col.key)
                    const bonus = hasBonus(j.id, col.key)
                    const resultScore = journee.resultats?.[col.key]

                    let correct = null
                    if (resultScore && prono && (resultScore.status === 'FINISHED' || resultScore.status === 'IN_PLAY')) {
                      const rh = resultScore.h, ra = resultScore.a
                      if (col.isScorer) {
                        const [ph, pa] = (prono.val || '').split('-').map(Number)
                        correct = ph === rh && pa === ra ? 'exact' : (Math.sign(ph-pa) === Math.sign(rh-ra) ? 'issue' : 'wrong')
                      } else {
                        const issue = rh > ra ? '1' : rh < ra ? '2' : 'N'
                        correct = prono.val === issue ? 'correct' : 'wrong'
                      }
                    }

                    return (
                      <td key={col.key} style={{
                        textAlign:'center', padding:'4px 2px',
                        borderBottom:'1px solid rgba(255,255,255,.05)',
                        background: prono?.isMissile ? 'rgba(248,113,113,.06)' : col.isScorer ? 'rgba(96,165,250,.03)' : col.isEuro ? 'rgba(251,146,60,.03)' : 'transparent',
                      }}>
                        {prono ? (
                          <div style={{
                            display:'inline-flex', flexDirection:'column', alignItems:'center',
                            padding:'3px 5px', borderRadius:6, minWidth:38,
                            background: correct === 'exact' ? 'rgba(255,200,0,.18)' : correct === 'correct' || correct === 'issue' ? 'rgba(155,226,45,.08)' : correct === 'wrong' ? 'rgba(248,113,113,.08)' : 'rgba(255,255,255,.04)',
                            border: `1px solid ${correct === 'exact' ? 'rgba(255,200,0,.5)' : correct === 'correct' || correct === 'issue' ? 'rgba(155,226,45,.15)' : correct === 'wrong' ? 'var(--r-b)' : 'rgba(255,255,255,.06)'}`,
                          }}>
                            <div style={{
                              fontFamily:'var(--D)', fontSize:16, letterSpacing:'.04em',
                              color: correct === 'exact' ? '#FFD700' : prono.isMissile ? 'var(--r)' : col.isScorer ? 'var(--b)' : 'var(--tx)',
                              lineHeight:1,
                            }}>
                              {prono.val}
                            </div>
                            {bonus && <div style={{ fontSize:9, lineHeight:1 }}>{bonus}</div>}
                            {prono.isMissile && <div style={{ fontSize:9, color:'var(--r)', lineHeight:1 }}>🚀</div>}
                          </div>
                        ) : (
                          <span style={{ color:'var(--bd2)', fontSize:12 }}>—</span>
                        )}
                      </td>
                    )
                  })}

                  {/* Colonne BONUS */}
                  <td style={{ textAlign:'center', padding:'4px 6px', borderBottom:'1px solid rgba(255,255,255,.05)', verticalAlign:'middle' }}>
                    {hasProno ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:2, alignItems:'center' }}>
                        {pronos[j.id]?.jackpotMatch && (
                          <div style={{ fontSize:10, color:'var(--tx2)' }}>
                            <span style={{ fontSize:12 }}>🎰</span> {getMatchName(pronos[j.id].jackpotMatch).split('—')[0].trim()}
                          </div>
                        )}
                        {pronos[j.id]?.dcMatch && (
                          <div style={{ fontSize:10, color:'var(--tx2)' }}>
                            <span style={{ fontSize:12 }}>2️⃣</span> {getMatchName(pronos[j.id].dcMatch).split('—')[0].trim()}
                          </div>
                        )}
                        {!pronos[j.id]?.jackpotMatch && !pronos[j.id]?.dcMatch && (
                          <span style={{ color:'var(--bd2)', fontSize:12 }}>—</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color:'var(--bd2)', fontSize:12 }}>—</span>
                    )}
                  </td>

                  {/* Colonne MISSILE */}
                  <td style={{ textAlign:'center', padding:'4px 8px', borderBottom:'1px solid rgba(255,255,255,.05)', verticalAlign:'middle', background:'rgba(248,113,113,.02)' }}>
                    {missileLance ? (
                      <div style={{ fontSize:10, lineHeight:1.5 }}>
                        <div style={{ color:'var(--r)', fontWeight:700, whiteSpace:'nowrap' }}>
                          ↗ <strong>{joueursById[missileLance.cible]?.nom?.split(' ')[0] || '?'}</strong>
                        </div>
                        <div style={{ color:'var(--tx3)', fontSize:9 }}>
                          {getMatchName(missileLance.matchKey).split('—')[0].trim()} → <strong style={{ color:'var(--tx2)' }}>{missileLance.pronoImpose}</strong>
                        </div>
                        {missileLance.applique
                          ? <div style={{ color:'var(--g)', fontSize:9, fontWeight:700 }}>✓ appliqué</div>
                          : <div style={{ color:'var(--a)', fontSize:9 }}>⏳ en attente</div>
                        }
                      </div>
                    ) : missileRecu ? (
                      <div style={{ fontSize:10, lineHeight:1.5 }}>
                        <div style={{ color:'var(--a)', fontWeight:700, whiteSpace:'nowrap' }}>
                          ↙ <strong>{joueursById[missileRecu.lanceur]?.nom?.split(' ')[0] || '?'}</strong>
                        </div>
                        <div style={{ color:'var(--tx3)', fontSize:9 }}>
                          {getMatchName(missileRecu.matchKey).split('—')[0].trim()} → <strong style={{ color:'var(--r)' }}>{missileRecu.pronoImpose}</strong>
                        </div>
                        {missileRecu.applique
                          ? <div style={{ color:'var(--g)', fontSize:9, fontWeight:700 }}>✓ appliqué</div>
                          : <div style={{ color:'var(--a)', fontSize:9 }}>⏳ en attente</div>
                        }
                      </div>
                    ) : (
                      <span style={{ color:'var(--bd2)', fontSize:12 }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
