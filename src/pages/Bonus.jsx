import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'

export default function Bonus() {
  const { profil, user } = useUser()
  const [bonus, setBonus] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [targeted, setTargeted] = useState(null)
  const [loading, setLoading] = useState(true)
  const [historique, setHistorique] = useState([])

  useEffect(() => {
    const load = async () => {
      if (user) {
        const snap = await getDoc(doc(db,'joueurs',user.uid))
        if (snap.exists()) setBonus(snap.data().bonus || { missile:5, jackpot:3, doubleChance:4 })
      }
      const jSnap = await getDocs(collection(db,'joueurs'))
      setJoueurs(jSnap.docs.map(d=>({id:d.id,...d.data()})).filter(j=>j.id!==user?.uid))
      // Charger historique bonus
      const journeesSnap = await getDocs(query(collection(db,'journees'), orderBy('numero','asc')))
      const hist = []
      for (const jDoc of journeesSnap.docs) {
        const j = jDoc.data()
        if (!user) continue
        // Pronos du joueur
        const pronoDoc = await getDoc(doc(db,'journees',jDoc.id,'pronos',user.uid))
        if (pronoDoc.exists()) {
          const p = pronoDoc.data()
          if (p.jackpotMatch) hist.push({ journee: j.numero, type:'jackpot', match: p.jackpotMatch, jId: jDoc.id })
          if (p.dcMatch && p.dcChoices) hist.push({ journee: j.numero, type:'dc', match: p.dcMatch, choix: p.dcChoices, jId: jDoc.id })
        }
        // Missiles lancés par ce joueur
        const missilesSnap = await getDocs(collection(db,'journees',jDoc.id,'missiles'))
        missilesSnap.docs.forEach(d => {
          const m = d.data()
          if (m.lanceur === user.uid) {
            hist.push({ journee: j.numero, type:'missile', match: m.matchKey, cibleId: m.cible, pronoImpose: m.pronoImpose, applique: m.applique, jId: jDoc.id })
          }
        })
      }
      setHistorique(hist.reverse())
      setLoading(false)
    }
    load()
  }, [user])

  const COLORS = [
    ['rgba(255,215,0,.14)','#FFD700'],['rgba(192,192,192,.12)','#C0C0C0'],
    ['rgba(205,127,50,.12)','#CD7F32'],['rgba(96,165,250,.12)','#93C5FD'],
    ['rgba(155,226,45,.12)','#9BE22D'],['rgba(192,132,252,.12)','#DDD6FE'],
  ]

  const BONUS_INFO = [
    { key:'missile', ico:'🎯', lbl:'Missiles', color:'var(--r)', dim:'var(--r-dim)', border:'var(--r-b)' },
    { key:'jackpot', ico:'🎰', lbl:'Jackpots', color:'var(--a)', dim:'var(--a-dim)', border:'var(--a-b)' },
    { key:'doubleChance', ico:'2️⃣', lbl:'Doubles', color:'var(--p)', dim:'var(--p-dim)', border:'var(--p-b)' },
  ]

  return (
    <div className="scroll-area">
      <div style={{ padding:'16px 20px 0' }}>
        <div className="page-title">Bonus</div>
        <div className="page-sub">Saison 26/27 · {profil?.nom?.split(' ')[0]}</div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div className="spinner" style={{ width:24, height:24 }}></div>
        </div>
      ) : (
        <>
          {/* Stock */}
          <div style={{ margin:'14px 16px', background:'linear-gradient(135deg, rgba(17,31,23,.96), rgba(10,5,20,.96))', border:'1px solid var(--p-b)', borderRadius:'var(--R)', padding:16, boxShadow:'var(--shadow)' }}>
            <div style={{ fontSize:10, fontWeight:900, color:'var(--p)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:12 }}>Ton stock</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {BONUS_INFO.map(b => {
                const n = bonus?.[b.key] ?? 0
                return (
                  <div key={b.key} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:24, marginBottom:4 }}>{b.ico}</div>
                    <div style={{ fontFamily:'var(--D)', fontSize:32, letterSpacing:'.03em', lineHeight:1, color: n===0?'var(--r)':n<=1?'var(--a)':b.color, textShadow:`0 0 10px ${n>0?b.color:'transparent'}44` }}>{n}</div>
                    <div style={{ fontSize:10, color:'var(--tx3)', fontWeight:900, marginTop:3, textTransform:'uppercase', letterSpacing:'.06em' }}>{b.lbl}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Règles */}
          <div className="section-lbl">📖 Règles</div>
          <div style={{ margin:'0 16px 14px', display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { ico:'🎯', title:'Missile', color:'var(--r)', dim:'var(--r-dim)', border:'var(--r-b)', desc:'Le plus puissant. Tu choisis un adversaire + un match et tu REMPLACES son prono par le résultat de ton choix. Prévaut sur tous les autres bonus.' },
              { ico:'🎰', title:'Jackpot', color:'var(--a)', dim:'var(--a-dim)', border:'var(--a-b)', desc:'Double tes points sur le match de ton choix. Non utilisable sur le scorer.' },
              { ico:'2️⃣', title:'Double Chance', color:'var(--p)', dim:'var(--p-dim)', border:'var(--p-b)', desc:'Joue 2 résultats sur 1 match (ex: 1/N). Si l\'un des deux est bon → 1pt.' },
            ].map(b => (
              <div key={b.title} style={{ background:`linear-gradient(135deg, rgba(17,31,23,.94), rgba(8,15,11,.96))`, border:`1px solid ${b.border}`, borderRadius:'var(--R)', padding:14, display:'flex', gap:12, boxShadow:'var(--shadow)' }}>
                <div style={{ fontSize:24, flexShrink:0 }}>{b.ico}</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:13, color:b.color, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4 }}>{b.title}</div>
                  <div style={{ fontSize:12, color:'var(--tx2)', lineHeight:1.6 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Historique bonus */}
          {historique.length > 0 && (
            <>
              <div className="section-lbl">📋 Historique des bonus joués</div>
              <div style={{ margin:'0 16px 24px', display:'flex', flexDirection:'column', gap:8 }}>
                {historique.map((h, idx) => {
                  const isMS = h.type === 'missile'
                  const isJP = h.type === 'jackpot'
                  const isDC = h.type === 'dc'
                  const color = isMS ? 'var(--r)' : isJP ? 'var(--a)' : 'var(--p)'
                  const dim = isMS ? 'var(--r-dim)' : isJP ? 'var(--a-dim)' : 'var(--p-dim)'
                  const border = isMS ? 'var(--r-b)' : isJP ? 'var(--a-b)' : 'var(--p-b)'
                  const ico = isMS ? '🎯' : isJP ? '🎰' : '2️⃣'
                  const label = isMS ? 'Missile' : isJP ? 'Jackpot' : 'Double Chance'

                  return (
                    <div key={idx} style={{ background:dim, border:`1px solid ${border}`, borderRadius:'var(--Rs)', padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{ico}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontWeight:900, color, fontSize:12, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</span>
                          <span style={{ fontSize:11, color:'var(--tx3)', fontWeight:700 }}>J{h.journee}</span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--tx2)', marginTop:3, lineHeight:1.5 }}>
                          📍 {h.match?.replace('l1_','#').replace('scorer','Scorer').replace('euro','Euro')}
                          {isMS && h.pronoImpose && <span> → <strong style={{color}}>{h.pronoImpose}</strong></span>}
                          {isDC && h.choix && <span> → <strong style={{color}}>{h.choix.join(' ou ')}</strong></span>}
                        </div>
                        {isMS && (
                          <div style={{ fontSize:11, marginTop:3, color: h.applique ? 'var(--g)' : 'var(--a)', fontWeight:700 }}>
                            {h.applique ? '✅ Missile appliqué' : '⏳ En attente'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
