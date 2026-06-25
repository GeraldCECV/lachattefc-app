import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
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
      try {
        const allSnap = await getDocs(query(collection(db,'journees'), orderBy('numero','asc')))
        const fermee = allSnap.docs.filter(d => d.data().statut === 'fermee').pop()
        const lastResultats = allSnap.docs.filter(d => d.data().statut === 'resultats').pop()
        const ouverte = allSnap.docs.filter(d => d.data().statut === 'ouverte').pop()
        const jDoc = fermee || lastResultats || ouverte
        if (!jDoc) { setLoading(false); return }

        const j = { id: jDoc.id, ...jDoc.data() }
        setJournee(j)

        const joueursSnap = await getDocs(collection(db,'joueurs'))
        const joueursData = joueursSnap.docs.map(d => ({ id:d.id, ...d.data() }))
          .sort((a,b) => (a.nom||'').localeCompare(b.nom||''))
        setJoueurs(joueursData)

        if (j.statut === 'fermee' || j.statut === 'resultats') {
          const pronosSnap = await getDocs(collection(db,'journees',jDoc.id,'pronos'))
          const pronosData = {}
          pronosSnap.docs.forEach(d => { pronosData[d.id] = d.data() })
          setPronos(pronosData)

          const missilesSnap = await getDocs(collection(db,'journees',jDoc.id,'missiles'))
          setMissiles(missilesSnap.docs.map(d => ({ id:d.id, ...d.data() })))
        }
      } catch(e) {
        console.error('PronosChatteux load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:32, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <div style={{ fontFamily:'var(--D)', fontSize:28, letterSpacing:'.04em', marginBottom:8 }}>Pronos secrets</div>
      <div style={{ fontSize:13, color:'var(--tx3)', lineHeight:1.7, maxWidth:280, margin:'0 auto' }}>
        Les pronos des autres chatteux seront visibles après la deadline de J{journee?.numero}.
      </div>
      {journee?.deadline && (
        <div style={{ marginTop:16, padding:'10px 16px', background:'rgba(155,226,45,.06)', border:'1px solid var(--g-b)', borderRadius:'var(--Rs)', fontSize:13, color:'var(--g)', fontWeight:700, display:'inline-block' }}>
          ⏰ Deadline : {new Date(journee.deadline.seconds*1000).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' })} à 23h
        </div>
      )}
    </div>
  )

  // Build match columns
  const scorer = journee.matchScorer
  const matchesL1 = (journee.matchesL1 || []).filter(m => m?.dom)
  const euro = journee.matchEuro?.dom ? journee.matchEuro : null

  const cols = [
    scorer?.dom ? { key:'scorer', label:'⚽', dom: scorer.dom, ext: scorer.ext, isScorer: true } : null,
    ...matchesL1.map((m, i) => ({ key:`l1_${i}`, label:`#${i+1}`, dom: m.dom, ext: m.ext })),
    euro ? { key:'euro', label:'🌍', dom: euro.dom, ext: euro.ext, isEuro: true } : null,
  ].filter(Boolean)

  // Map joueurs par id pour lookup rapide
  const joueursById = {}
  joueurs.forEach(j => { joueursById[j.id] = j })

  // Nom du match pour affichage missile
  const getMatchName = (key) => {
    if (key === 'scorer') return scorer ? `${scorer.dom} — ${scorer.ext}` : key
    if (key === 'euro') return euro ? `${euro.dom} — ${euro.ext}` : key
    const idx = parseInt(key.replace('l1_',''))
    const m = matchesL1[idx]
    return m ? `${m.dom} — ${m.ext}` : key
  }

  const getVal = (uid, key) => {
    const p = pronos[uid]
    if (!p) return null
    const missile = missiles.find(m => m.cible === uid && m.matchKey === key && m.applique)
    if (missile) return { val: missile.pronoImpose, isMissile: true }
    if (key === 'scorer') return p.matchScorer ? { val: p.matchScorer } : null
    if (key === 'euro') return p.matchEuro ? { val: p.matchEuro } : null
    const idx = parseInt(key.replace('l1_',''))
    return p.matchesL1?.[idx] ? { val: p.matchesL1[idx] } : null
  }

  const hasBonus = (uid, key) => {
    const p = pronos[uid]
    if (!p) return null
    if (p.jackpotMatch === key) return '🎰'
    if (p.dcMatch === key) return '2️⃣'
    return null
  }

  return (
    <div style={{ padding:'16px 0 24px' }}>
      {/* Header */}
      <div style={{ padding:'0 16px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="page-title" style={{ fontSize:26 }}>Pronos J{journee.numero}</div>
          <div style={{ fontSize:12, color:'var(--tx3)', marginTop:2 }}>{Object.keys(pronos).length} / {joueurs.length} joueurs</div>
        </div>
        <span className={`pill ${journee.statut==='resultats'?'pill-g':'pill-a'}`}>
          {journee.statut==='resultats'?'🏁 Résultats':'🔒 Fermée'}
        </span>
      </div>

      {/* Tableau scrollable */}
      <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:8 }}>
        <table style={{ borderCollapse:'separate', borderSpacing:0, minWidth: 80 + cols.length * 52 }}>
          {/* Header matchs */}
          <thead>
            <tr>
              <th style={{ position:'sticky', left:0, zIndex:2, background:'#07100C', padding:'8px 12px', textAlign:'left', fontSize:11, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', borderBottom:'1px solid var(--bd)', minWidth:90 }}>
                Joueur
              </th>
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
              <th style={{ padding:'4px 6px', textAlign:'center', borderBottom:'1px solid var(--bd)', background:'rgba(0,0,0,.2)', fontSize:9, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', minWidth:50 }}>PTS</th>
            </tr>
          </thead>

          {/* Lignes joueurs */}
          <tbody>
            {joueurs.map(j => {
              const isMe = j.id === profil?.id
              const hasProno = !!pronos[j.id]
              const missileLance = missiles.find(m => m.lanceur === j.id)
              const missileRecu = missiles.find(m => m.cible === j.id)

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

                  {/* Colonne PTS — valeur Firebase */}
                  <td style={{ textAlign:'center', padding:'4px 6px', borderBottom:'1px solid rgba(255,255,255,.05)', verticalAlign:'middle' }}>
                    {j.pointsTotal != null ? (
                      <div style={{ fontFamily:'var(--D)', fontSize:18, color:'var(--tx)', fontWeight:900 }}>
                        {j.pointsTotal}
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
