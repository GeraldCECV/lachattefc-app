import { useState, useEffect } from 'react'
import { collection, getDocs, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'

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
  const [joueursMap, setJoueursMap] = useState({})
  const [journee, setJournee] = useState(null)
  const [classJ, setClassJ] = useState([])
  const [classG, setClassG] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    let unsub = null
    const load = async () => {
      const snap = await getDocs(collection(db,'joueurs'))
      const map = {}
      snap.docs.forEach((d,i) => { map[d.id] = { id:d.id, idx:i, ...d.data() } })
      setJoueursMap(map)
      setClassG(Object.values(map).sort((a,b)=>(b.pointsTotal||0)-(a.pointsTotal||0)).map((j,i)=>({...j,rank:i+1})))

      const jSnap = await getDocs(query(collection(db,'journees'),orderBy('numero','desc'),limit(1)))
      if (!jSnap.empty) {
        const jDoc = jSnap.docs[0]
        setJournee({ id:jDoc.id, ...jDoc.data() })
        unsub = onSnapshot(doc(db,'journees',jDoc.id), d => {
          if (!d.exists()) return
          const data = d.data()
          setJournee({ id:d.id, ...data })
          setLastUpdate(new Date())
          const pts = data.pointsJoueurs||{}
          const gains = data.gainsJoueurs||{}
          setClassJ(Object.values(map).map(j=>({...j,ptsJ:pts[j.id]||0,gainJ:gains[j.id]||0})).sort((a,b)=>b.ptsJ-a.ptsJ).map((j,i)=>({...j,rank:i+1})))
        })
      }
      setLoading(false)
    }
    load()
    return () => { if (unsub) unsub() }
  }, [])

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
          {net!==undefined && <div style={{ fontSize:11, color:net>=0?'var(--g)':'var(--r)', fontWeight:900, marginTop:1 }}>{net>=0?'+':''}{net}€ net</div>}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--D)', fontSize:24, letterSpacing:'.03em', color:isMe?'var(--g)':'var(--tx)', lineHeight:1, textShadow:isMe?'0 0 10px rgba(155,226,45,.3)':'none' }}>
            {pts}
          </div>
          {gain>0 && <div style={{ fontSize:11, color:'var(--g)', fontWeight:900 }}>+{gain}€</div>}
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
        {lastUpdate && (
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
            { id:'journee', label:`⚡ J${journee?.numero||'?'}` },
            { id:'general', label:'🏆 Général' },
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
          ) : classJ.map((j,i) => <PlayerRow key={j.id} j={j} idx={i} pts={j.ptsJ} gain={j.gainJ} />)
        ) : (
          classG.length===0 ? (
            <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--tx3)', fontSize:13 }}>Aucun joueur enregistré</div>
          ) : classG.map((j,i) => {
            const net = (j.gainsTotal||0) - (j.journeesJouees||0)*5
            return <PlayerRow key={j.id} j={j} idx={i} pts={j.pointsTotal||0} gain={j.gainsTotal||0} net={net} />
          })
        )}
      </div>

      {/* Barème */}
      <div style={{ margin:'12px 16px 24px', padding:'12px 14px', background:'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))', border:'1px solid var(--bd)', borderRadius:'var(--Rs)', boxShadow:'var(--shadow)' }}>
        <div style={{ fontSize:10, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>💰 Barème gains / journée</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 12px', fontSize:12, color:'var(--tx2)', fontWeight:700 }}>
          {[[1,24],[2,18],[3,14],[4,11],[5,8],[6,5]].map(([r,g]) => (
            <span key={r}>{r===1?'🥇':r===2?'🥈':r===3?'🥉':`${r}e`} → <span style={{color:'var(--g)'}}>{g}€</span></span>
          ))}
        </div>
      </div>
    </div>
  )
}
