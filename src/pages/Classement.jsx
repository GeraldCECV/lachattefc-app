import { useState, useEffect } from 'react'
import { collection, getDocs, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'

const BAREME_CDM = [24, 16, 12, 9, 7, 5, 4, 3]

function issueMatch(h, a) {
  if (h > a) return '1'
  if (h < a) return '2'
  return 'N'
}

function calcPointsScorer(prono, rh, ra) {
  if (!prono || !/^\d+-\d+$/.test(prono)) return 0
  const [ph, pa] = prono.split('-').map(Number)
  if (ph === rh && pa === ra) return 3
  if ((ph - pa) === (rh - ra)) return 2
  return Math.sign(ph - pa) === Math.sign(rh - ra) ? 1 : 0
}

const COLORS = [
  ['rgba(255,215,0,.14)','#FFD700'],['rgba(192,192,192,.12)','#C0C0C0'],
  ['rgba(205,127,50,.12)','#CD7F32'],['rgba(96,165,250,.12)','#93C5FD'],
  ['rgba(155,226,45,.12)','#9BE22D'],['rgba(192,132,252,.12)','#DDD6FE'],
  ['rgba(251,191,36,.12)','#FCD34D'],['rgba(248,113,113,.12)','#FCA5A5'],
  ['rgba(20,184,166,.12)','#5EEAD4'],['rgba(251,146,60,.12)','#FDBA74'],
]
const getC = i => COLORS[i % COLORS.length]

export default function Classement() {
  const { profil } = useUser()
  const [tab, setTab] = useState('journee')
  const [historiqueList, setHistoriqueList] = useState([])
  const [loadingHistorique, setLoadingHistorique] = useState(false)
  const [selectedHistJ, setSelectedHistJ] = useState(null)
  const [joueursMap, setJoueursMap] = useState({})
  const [journee, setJournee] = useState(null)
  const [classJ, setClassJ] = useState([])
  const [classG, setClassG] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    let unsubJournee = null, unsubPronos = null, unsubMissiles = null
    let map = {}
    let journeeData = null
    let pronosMap = {}
    let missiles = []

    const recalc = () => {
      if (!journeeData) return
      const data = journeeData
      const isCDM = data.type === 'cdm'
      const matches = isCDM ? (data.matchesCDM || []) : (data.matchesL1 || [])
      const resultats = data.resultats || {}
      const penalites = data.penalites || {}
      const pointsParJoueur = {}
      Object.keys(map).forEach(uid => { pointsParJoueur[uid] = penalites[uid] || 0 })

      const pronosAvecMissiles = JSON.parse(JSON.stringify(pronosMap))
      missiles.forEach(m => {
        if (!m.applique) return
        const arrKey = isCDM ? 'matchesCDM' : 'matchesL1'
        const prefix = isCDM ? 'cdm_' : 'l1_'
        if (m.matchKey?.startsWith(prefix) && pronosAvecMissiles[m.cible]) {
          const i = parseInt(m.matchKey.replace(prefix,''))
          if (!pronosAvecMissiles[m.cible][arrKey]) pronosAvecMissiles[m.cible][arrKey] = []
          pronosAvecMissiles[m.cible][arrKey][i] = m.pronoImpose
        }
      })

      Object.keys(pronosMap).forEach(uid => {
        const p = pronosAvecMissiles[uid]
        matches.forEach((m, i) => {
          const key = isCDM ? `cdm_${i}` : `l1_${i}`
          const res = resultats[key]
          if (!res || (res.status!=='FINISHED'&&res.status!=='IN_PLAY'&&res.status!=='PAUSED') || res.h===null) return
          const rh = parseInt(res.h), ra = parseInt(res.a)
          const arrKey = isCDM ? 'matchesCDM' : 'matchesL1'
          const prono = p?.[arrKey]?.[i]
          if (!prono) return
          const isScorer = data.scorerOnly || m.scorer
          if (isScorer) {
            pointsParJoueur[uid] = (pointsParJoueur[uid]||0) + calcPointsScorer(prono, rh, ra)
          } else {
            const issue = issueMatch(rh, ra)
            if (p.dcMatch === key && p.dcChoices?.includes(issue)) {
              pointsParJoueur[uid] = (pointsParJoueur[uid]||0) + 1
            } else if (prono === issue) {
              const total = Object.values(pronosAvecMissiles).filter(pp => pp?.[arrKey]?.[i] === issue).length
              const nb = Object.keys(pronosMap).length
              let pts = (nb>0 && total/nb<=0.25) ? 2 : 1
              if (p.jackpotMatch === key) pts *= 2
              pointsParJoueur[uid] = (pointsParJoueur[uid]||0) + pts
            }
          }
        })
      })

      const auMoinsUnMatch = Object.values(resultats).some(r => ['FINISHED','IN_PLAY','PAUSED'].includes(r?.status))
      const gains = {}
      if (auMoinsUnMatch && isCDM) {
        const classement = Object.entries(pointsParJoueur).sort((a,b)=>b[1]-a[1])
        let i = 0
        while (i < classement.length) {
          const pts = classement[i][1]
          let j = i
          while (j < classement.length && classement[j][1] === pts) j++
          let gainPartage = 0
          for (let r = i+1; r <= j; r++) gainPartage += BAREME_CDM[r-1] || 0
          const gainParJoueur = Math.round(gainPartage/(j-i)*100)/100
          for (let k = i; k < j; k++) gains[classement[k][0]] = gainParJoueur
          i = j
        }
      } else if (data.gainsJoueurs) {
        Object.assign(gains, data.gainsJoueurs)
      }

      setLastUpdate(new Date())
      setClassJ(Object.values(map).map(j=>({...j,ptsJ:pointsParJoueur[j.id]||0,gainJ:gains[j.id]||0})).sort((a,b)=>b.gainJ-a.gainJ||b.ptsJ-a.ptsJ).map((j,i)=>({...j,rank:i+1})))
    }

    const load = async () => {
      const snap = await getDocs(collection(db,'joueurs'))
      map = {}
      snap.docs.forEach((d,i) => { map[d.id] = { id:d.id, idx:i, ...d.data() } })
      setJoueursMap(map)
      setClassG(Object.values(map).sort((a,b)=>{
        const netA = (a.gainsTotal||0) - (a.journeesJouees||0)*5
        const netB = (b.gainsTotal||0) - (b.journeesJouees||0)*5
        return netB - netA
      }).map((j,i)=>({...j,rank:i+1})))

      const allJ = await getDocs(query(collection(db,'journees'),orderBy('numero','asc')))
      const openJ = allJ.docs.find(d => ['ouverte','fermee'].includes(d.data().statut))
      const jDoc = openJ || allJ.docs[allJ.docs.length-1]
      if (jDoc) {
        // Listener journée (résultats, statut)
        unsubJournee = onSnapshot(doc(db,'journees',jDoc.id), d => {
          if (!d.exists()) return
          journeeData = d.data()
          setJournee({ id:d.id, ...journeeData })
          recalc()
        })
        // Listener pronos (au cas où un joueur soumet/modifie après coup)
        unsubPronos = onSnapshot(collection(db,'journees',jDoc.id,'pronos'), snap => {
          pronosMap = {}
          snap.docs.forEach(d => { pronosMap[d.id] = d.data() })
          recalc()
        })
        // Listener missiles (dès qu'un missile est appliqué)
        unsubMissiles = onSnapshot(collection(db,'journees',jDoc.id,'missiles'), snap => {
          missiles = snap.docs.map(d => d.data())
          recalc()
        })
      }
      setLoading(false)
    }
    load()
    return () => {
      if (unsubJournee) unsubJournee()
      if (unsubPronos) unsubPronos()
      if (unsubMissiles) unsubMissiles()
    }
  }, [])

  useEffect(() => {
    if (tab !== 'historique') return
    setHistoriqueList([])
    setLoadingHistorique(true)
    const loadHist = async () => {
      const snap = await getDocs(query(collection(db,'journees'), orderBy('numero','desc')))
      const hist = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(j => j.statut === 'resultats' && j.pointsJoueurs)
      setHistoriqueList(hist)
      if (hist.length > 0) setSelectedHistJ(hist[0].id)
      setLoadingHistorique(false)
    }
    loadHist()
  }, [tab])

  const Rank = ({rank}) => {
    if (rank===1) return <span style={{fontSize:18}}>🥇</span>
    if (rank===2) return <span style={{fontSize:18}}>🥈</span>
    if (rank===3) return <span style={{fontSize:18}}>🥉</span>
    return <span style={{fontSize:13,fontWeight:900,color:'var(--tx3)',width:24,textAlign:'center',display:'inline-block'}}>{rank}</span>
  }

  const PlayerRow = ({j, idx, pts, gain, net}) => {
    const [bg,color] = getC(idx)
    const isMe = j.id === profil?.id
    const isLast = idx === (tab==='journee'?classJ:classG).length-1
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'12px 16px',
        background: isMe?'rgba(155,226,45,.06)':isLast?'rgba(248,113,113,.04)':'transparent',
        borderLeft: `3px solid ${isMe?'var(--g)':'transparent'}`,
        borderBottom:'1px solid rgba(155,226,45,.08)',
      }}>
        <Rank rank={j.rank} />
        <div className="av" style={{ width:34, height:34, background:isMe?'var(--g-dim)':bg, color:isMe?'var(--g)':color, fontSize:11, border:`1px solid ${isMe?'var(--g-b)':'rgba(255,255,255,.08)'}` }}>
          {j.initiales}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:isMe?900:700, color:isMe?'var(--g)':'var(--tx)', textTransform:'uppercase', letterSpacing:'.02em' }}>
            {j.nom?.split(' ')[0]} {isLast?'💩':''} {isMe?<span style={{fontSize:10,color:'var(--tx3)',fontWeight:400,textTransform:'none'}}>(toi)</span>:''}
          </div>
          {net!==undefined && false && <div style={{ fontSize:11, color:net>=0?'var(--g)':'var(--r)', fontWeight:900, marginTop:1 }}>{net>=0?'+':''}{net}€ net</div>}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:2 }}>Plus-value</div>
          <div style={{ fontFamily:'var(--D)', fontSize:22, letterSpacing:'.03em', color:net>=0?'var(--g)':'var(--r)', lineHeight:1, textShadow:isMe?'0 0 10px rgba(155,226,45,.3)':'none' }}>
            {net>=0?'+':''}{net}€
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scroll-area">
      <div style={{ padding:'16px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div className="page-title">Classement</div>
          <div className="page-sub">Saison 26/27</div>
        </div>
        {journee && ['ouverte','fermee'].includes(journee.statut) && Object.values(journee.resultats||{}).some(r => r?.status === 'IN_PLAY' || r?.status === 'PAUSED') && (
          <div className="live">
            <div className="live-dot"></div>
            Live
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ margin:'14px 16px 0', background:'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))', border:'1px solid var(--bd)', borderRadius:'var(--R)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
        <div style={{ display:'flex', borderBottom:'1px solid rgba(155,226,45,.1)', padding:'0 4px' }}>
          {[
            { id:'journee', label: journee ? `⚡ J${journee.numero}${journee.statut==='ouverte'||journee.statut==='fermee' ? ' 🟢' : ''}` : '⚡ Journée' },
            { id:'general', label:'🏆 Général' },
            { id:'historique', label:'📅 Historique' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'12px 8px', border:'none', background:'none',
              fontSize:12, fontWeight:900, cursor:'pointer',
              textTransform:'uppercase', letterSpacing:'.05em',
              color: tab===t.id ? 'var(--g)' : 'var(--tx3)',
              borderBottom: `2px solid ${tab===t.id ? 'var(--g)' : 'transparent'}`,
              transition:'all .15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(155,226,45,.08)', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, color:'var(--tx3)', fontWeight:700 }}>
            {tab==='journee'
              ? `${journee?.statut==='ouverte'?'⏰ En cours':journee?.statut==='fermee'?'🔒 Fermée':'🏁 Finalisée'} · reset chaque journée`
              : 'Cumulatif depuis J1 · màj chaque lundi'
            }
          </span>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div className="spinner" style={{ width:24, height:24 }}></div>
          </div>
        ) : tab==='journee' ? (
          classJ.length===0 ? (
            <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--tx3)', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>
              Aucun prono soumis pour cette journée
            </div>
          ) : (
            classJ.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⚡</div>
                <div className="empty-state-title">Aucun prono soumis</div>
                <div className="empty-state-sub">Les points apparaîtront dès que les matchs seront joués</div>
              </div>
            ) : (
              <table className="table" style={{ fontSize:13 }}>
                <thead>
                  <tr>
                    <th style={{width:40}}>#</th>
                    <th>Joueur</th>
                    <th style={{textAlign:'right'}}>Pts</th>
                    <th style={{textAlign:'right'}}>Gain</th>
                  </tr>
                </thead>
                <tbody>
                  {classJ.map((j,i) => {
                    const [bg,color] = getC(i)
                    const isMe = j.id === profil?.id
                    return (
                      <tr key={j.id} style={{ background: isMe ? 'rgba(155,226,45,.06)' : 'transparent' }}>
                        <td>
                          <span style={{ fontFamily:'var(--D)', fontSize:20, color: i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--tx3)' }}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div className="av" style={{ width:28, height:28, fontSize:10, background:isMe?'var(--g-dim)':bg, color:isMe?'var(--g)':color, border:`1px solid ${isMe?'var(--g-b)':'rgba(255,255,255,.08)'}` }}>
                              {j.initiales}
                            </div>
                            <span style={{ fontWeight:isMe?900:700, color:isMe?'var(--g)':'var(--tx)', textTransform:'uppercase', fontSize:12 }}>
                              {j.nom?.split(' ')[0]} {isMe && <span style={{fontSize:10,color:'var(--tx3)',fontWeight:400,textTransform:'none'}}>(toi)</span>}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign:'right', fontFamily:'var(--D)', fontSize:22, color:isMe?'var(--g)':'var(--tx)' }}>{j.ptsJ}</td>
                        <td style={{ textAlign:'right', color:'var(--g)', fontWeight:900, fontSize:12 }}>{j.gainJ > 0 ? `+${j.gainJ}€` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )
        ) : tab==='historique' ? (
          <div style={{ padding:'10px 16px 16px' }}>
            {loadingHistorique ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
                <div className="spinner" style={{ width:24, height:24 }}></div>
              </div>
            ) : historiqueList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-title">Aucune journée finalisée</div>
                <div className="empty-state-sub">L'historique apparaîtra ici après chaque journée</div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                  {historiqueList.map(j => (
                    <button key={j.id} onClick={() => setSelectedHistJ(j.id)} style={{
                      padding:'6px 12px', borderRadius:'var(--Rs)', fontSize:12, fontWeight:900,
                      textTransform:'uppercase', letterSpacing:'.04em', cursor:'pointer',
                      background: selectedHistJ===j.id ? 'linear-gradient(180deg, #B9F84F, #75B91D)' : 'rgba(255,255,255,.05)',
                      color: selectedHistJ===j.id ? '#07100C' : 'var(--tx3)',
                      border: `1px solid ${selectedHistJ===j.id ? 'rgba(155,226,45,.4)' : 'var(--bd2)'}`,
                    }}>
                      J{j.numero}
                    </button>
                  ))}
                </div>
                {(() => {
                  const j = historiqueList.find(j => j.id === selectedHistJ)
                  if (!j) return null
                  const sorted = Object.entries(j.pointsJoueurs || {}).sort((a,b) => b[1]-a[1])
                  return (
                    <table className="table" style={{ fontSize:13 }}>
                      <thead>
                        <tr>
                          <th style={{width:40}}>#</th>
                          <th>Joueur</th>
                          <th style={{textAlign:'right'}}>Pts J{j.numero}</th>
                          <th style={{textAlign:'right'}}>Gain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map(([uid, pts], i) => {
                          const jj = joueursMap[uid]
                          const gain = j.gainsJoueurs?.[uid] || 0
                          const isMe = uid === profil?.id
                          const [bg, color] = getC(i)
                          return (
                            <tr key={uid} style={{ background: isMe ? 'rgba(155,226,45,.06)' : 'transparent' }}>
                              <td>
                                <span style={{ fontFamily:'var(--D)', fontSize:20, color: i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--tx3)' }}>
                                  {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                                </span>
                              </td>
                              <td>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <div className="av" style={{ width:28, height:28, fontSize:10, background:isMe?'var(--g-dim)':bg, color:isMe?'var(--g)':color, border:`1px solid ${isMe?'var(--g-b)':'rgba(255,255,255,.08)'}` }}>
                                    {jj?.initiales || '?'}
                                  </div>
                                  <span style={{ fontWeight:isMe?900:700, color:isMe?'var(--g)':'var(--tx)', textTransform:'uppercase', fontSize:12 }}>
                                    {jj?.nom?.split(' ')[0] || uid} {isMe && <span style={{fontSize:10,color:'var(--tx3)',fontWeight:400,textTransform:'none'}}>(toi)</span>}
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign:'right', fontFamily:'var(--D)', fontSize:22, color:isMe?'var(--g)':'var(--tx)' }}>{pts}</td>
                              <td style={{ textAlign:'right', color:'var(--g)', fontWeight:900, fontSize:12 }}>{gain > 0 ? `+${gain}€` : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )
                })()}
              </>
            )}
          </div>
        ) : (
          classG.length===0 ? (
            <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--tx3)', fontSize:13 }}>Aucun joueur enregistré</div>
          ) : classG.map((j,i) => {
            const penalite = journee?.penalites?.[j.id] || 0
            const net = Math.round(((j.gainsTotal||0) - (j.journeesJouees||0)*5) * 100) / 100
            return <PlayerRow key={j.id} j={j} idx={i} pts={(j.pointsTotal||0) + penalite} gain={j.gainsTotal||0} net={net} />
          })
        )}
      </div>

      {/* Barème */}
      <div style={{ margin:'12px 16px 24px', padding:'12px 14px', background:'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))', border:'1px solid var(--bd)', borderRadius:'var(--Rs)', boxShadow:'var(--shadow)' }}>
        <div style={{ fontSize:10, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>💰 Barème gains / journée</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 12px', fontSize:12, color:'var(--tx2)', fontWeight:700 }}>
          {[[1,24],[2,16],[3,12],[4,9],[5,7],[6,5],[7,4],[8,3]].map(([r,g]) => (
            <span key={r}>{r===1?'🥇':r===2?'🥈':r===3?'🥉':`${r}e`} → <span style={{color:'var(--g)'}}>{g}€</span></span>
          ))}
        </div>
      </div>
    </div>
  )
}





