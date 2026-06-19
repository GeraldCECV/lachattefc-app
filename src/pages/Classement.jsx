import { useState, useEffect } from 'react'
import { collection, getDocs, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'

const COLORS = [
  ['rgba(255,215,0,.15)','#FFD700'],['rgba(192,192,192,.12)','#C0C0C0'],
  ['rgba(205,127,50,.12)','#CD7F32'],['rgba(96,165,250,.12)','var(--b)'],
  ['rgba(34,197,94,.12)','var(--g)'],['rgba(167,139,250,.12)','var(--p)'],
  ['rgba(245,158,11,.12)','var(--a)'],['rgba(239,68,68,.12)','var(--r)'],
  ['rgba(20,184,166,.12)','#0d9488'],['rgba(249,115,22,.12)','var(--o)'],
]
const getC = idx => COLORS[idx % COLORS.length]

export default function Classement() {
  const { profil } = useUser()
  const [tab, setTab] = useState('journee')
  const [joueurs, setJoueurs] = useState([])
  const [journee, setJournee] = useState(null)
  const [classJ, setClassJ] = useState([])
  const [classG, setClassG] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    let unsub = null
    const load = async () => {
      const jSnap = await getDocs(collection(db, 'joueurs'))
      const map = {}
      jSnap.docs.forEach((d, i) => { map[d.id] = { id: d.id, idx: i, ...d.data() } })
      setJoueurs(Object.values(map))

      const g = Object.values(map).sort((a, b) => (b.pointsTotal||0)-(a.pointsTotal||0)).map((j,i) => ({...j,rank:i+1}))
      setClassG(g)

      const snap = await getDocs(query(collection(db,'journees'),orderBy('numero','desc'),limit(1)))
      if (!snap.empty) {
        const jDoc = snap.docs[0]
        setJournee({ id: jDoc.id, ...jDoc.data() })

        unsub = onSnapshot(doc(db,'journees',jDoc.id), d => {
          if (!d.exists()) return
          const data = d.data()
          setJournee({ id: d.id, ...data })
          setLastUpdate(new Date())
          const pts = data.pointsJoueurs || {}
          const gains = data.gainsJoueurs || {}
          const ranked = Object.values(map)
            .map(j => ({ ...j, ptsJ: pts[j.id]||0, gainJ: gains[j.id]||0 }))
            .sort((a,b) => b.ptsJ-a.ptsJ)
            .map((j,i) => ({...j,rank:i+1}))
          setClassJ(ranked)
        })
      }
      setLoading(false)
    }
    load()
    return () => { if (unsub) unsub() }
  }, [])

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: '12px 8px', border: 'none', background: 'none',
      fontSize: 13, fontWeight: 600,
      color: tab === id ? 'var(--g)' : 'var(--tx3)',
      borderBottom: `2px solid ${tab === id ? 'var(--g)' : 'transparent'}`,
      cursor: 'pointer', transition: 'all .15s',
    }}>
      {label}
    </button>
  )

  const Rank = ({ rank, size = 'normal' }) => {
    if (rank === 1) return <span style={{ fontSize: size==='lg'?22:18 }}>🥇</span>
    if (rank === 2) return <span style={{ fontSize: size==='lg'?22:18 }}>🥈</span>
    if (rank === 3) return <span style={{ fontSize: size==='lg'?22:18 }}>🥉</span>
    return <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', width: 28, textAlign: 'center', display: 'inline-block' }}>{rank}</span>
  }

  const PlayerRow = ({ j, idx, pts, gain, showNet = false }) => {
    const [bg, color] = getC(idx)
    const isMe = j.id === profil?.id
    const isLast = idx === (tab==='journee' ? classJ : classG).length - 1
    const miseTotal = (j.journeesJouees||0) * 5
    const net = (j.gainsTotal||0) - miseTotal

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 16px',
        background: isMe ? 'rgba(34,197,94,.06)' : isLast ? 'rgba(239,68,68,.03)' : 'transparent',
        borderLeft: isMe ? '3px solid var(--g)' : '3px solid transparent',
        borderBottom: '1px solid var(--bd)',
      }}>
        <Rank rank={j.rank} />
        <div className="av" style={{ width: 34, height: 34, background: isMe ? 'var(--g-dim)' : bg, color: isMe ? 'var(--g)' : color, fontSize: 11 }}>
          {j.initiales}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--g)' : 'var(--tx)' }}>
            {j.nom?.split(' ')[0]} {isLast ? '💩' : ''} {isMe ? '(toi)' : ''}
          </div>
          {showNet && <div style={{ fontSize: 11, color: net >= 0 ? 'var(--g)' : 'var(--r)', fontWeight: 600, marginTop: 1 }}>
            {net >= 0 ? '+' : ''}{net}€ net
          </div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--D)', fontSize: 22, letterSpacing: '.03em', color: isMe ? 'var(--g)' : 'var(--tx)', lineHeight: 1 }}>
            {pts}
          </div>
          {gain > 0 && <div style={{ fontSize: 11, color: 'var(--g)', fontWeight: 600 }}>+{gain}€</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="scroll-area">
      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--D)', fontSize: 28, letterSpacing: '.04em' }}>🏆 Classement</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 2 }}>Saison 25/26</div>
        </div>
        {lastUpdate && (
          <div className="live">
            <div className="live-dot"></div>
            Live
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', margin: '14px 16px 0', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--R)', overflow: 'hidden' }}>
        <TabBtn id="journee" label={`⚡ J${journee?.numero || '?'}`} />
        <TabBtn id="general" label="🏆 Général" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 24, height: 24 }}></div>
        </div>
      ) : (
        <div style={{ margin: '10px 0 24px', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--R)', overflow: 'hidden', marginLeft: 16, marginRight: 16 }}>

          {/* Journée */}
          {tab === 'journee' && (
            <>
              <div style={{ padding: '10px 16px', background: 'var(--bg3)', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx3)' }}>
                  {journee?.statut === 'ouverte' ? '⏰ En cours' : journee?.statut === 'fermee' ? '🔒 Fermée' : '🏁 Finalisée'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Se remet à 0 chaque journée</span>
              </div>
              {classJ.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
                  Aucun prono soumis pour cette journée
                </div>
              ) : classJ.map((j, i) => (
                <PlayerRow key={j.id} j={j} idx={i} pts={j.ptsJ} gain={j.gainJ} />
              ))}
            </>
          )}

          {/* Général */}
          {tab === 'general' && (
            <>
              <div style={{ padding: '10px 16px', background: 'var(--bg3)', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx3)' }}>Cumulatif depuis J1</span>
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Màj chaque lundi</span>
              </div>
              {classG.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
                  Aucun joueur enregistré
                </div>
              ) : classG.map((j, i) => (
                <PlayerRow key={j.id} j={j} idx={i} pts={j.pointsTotal||0} gain={j.gainsTotal||0} showNet={true} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Barème */}
      <div style={{ margin: '0 16px 24px', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--Rs)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
          💰 Barème gains / journée
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, color: 'var(--tx2)' }}>
          {[[1,21],[2,16],[3,12],[4,9],[5,7],[6,5]].map(([r,g]) => (
            <span key={r}>{r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `${r}e`} → {g}€</span>
          ))}
        </div>
      </div>
    </div>
  )
}
