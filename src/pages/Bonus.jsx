import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'

export default function Bonus() {
  const { profil, user } = useUser()
  const [bonus, setBonus] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [targeted, setTargeted] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (user) {
        const snap = await getDoc(doc(db, 'joueurs', user.uid))
        if (snap.exists()) setBonus(snap.data().bonus || { missile: 5, jackpot: 3, doubleChance: 4 })
      }
      const jSnap = await getDocs(collection(db, 'joueurs'))
      setJoueurs(jSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(j => j.id !== user?.uid))
      setLoading(false)
    }
    load()
  }, [user])

  const COLORS = [
    ['rgba(255,215,0,.15)','#FFD700'],['rgba(192,192,192,.12)','#C0C0C0'],
    ['rgba(205,127,50,.12)','#CD7F32'],['rgba(96,165,250,.12)','var(--b)'],
    ['rgba(34,197,94,.12)','var(--g)'],['rgba(167,139,250,.12)','var(--p)'],
  ]

  return (
    <div className="scroll-area">
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontFamily: 'var(--D)', fontSize: 28, letterSpacing: '.04em' }}>🎁 Bonus</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 2 }}>Saison 25/26 · {profil?.nom?.split(' ')[0]}</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 24, height: 24 }}></div>
        </div>
      ) : (
        <>
          {/* Stock */}
          <div style={{ margin: '14px 16px', background: 'linear-gradient(135deg, var(--bg2), #13101e)', border: '1px solid var(--p-b)', borderRadius: 'var(--R)', padding: '16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Ton stock</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { ico: '🎯', n: bonus?.missile ?? 5, lbl: 'Missiles', color: 'var(--r)' },
                { ico: '🎰', n: bonus?.jackpot ?? 3, lbl: 'Jackpots', color: 'var(--a)' },
                { ico: '2️⃣', n: bonus?.doubleChance ?? 4, lbl: 'Doubles', color: 'var(--p)' },
              ].map(b => (
                <div key={b.lbl} style={{ background: 'var(--bg3)', borderRadius: 'var(--Rs)', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{b.ico}</div>
                  <div style={{ fontFamily: 'var(--D)', fontSize: 30, letterSpacing: '.03em', color: b.n === 0 ? 'var(--r)' : b.n <= 1 ? 'var(--a)' : b.color, lineHeight: 1 }}>{b.n}</div>
                  <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 600, marginTop: 3 }}>{b.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Règles */}
          <div className="section-lbl">📖 Règles des bonus</div>
          <div style={{ margin: '0 16px 14px' }}>
            {[
              { ico: '🎯', title: 'Missile', desc: 'Choisir un adversaire + un match. Si vos pronostics sont DIFFÉRENTS sur ce match, tu gagnes 2pts bonus.' },
              { ico: '🎰', title: 'Jackpot', desc: 'Double tes points sur le match de ton choix. Non utilisable sur le scorer.' },
              { ico: '2️⃣', title: 'Double Chance', desc: 'Joue 2 résultats sur 1 match (ex: 1/N). Si l\'un des deux est bon = 1pt.' },
            ].map(b => (
              <div key={b.title} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12 }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{b.ico}</div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.5 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Missile — cibler un adversaire */}
          <div className="section-lbl">🎯 Lancer un missile</div>
          <div style={{ margin: '0 16px 14px' }} className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Choisir la cible</div>
              <span className="pill pill-r">{bonus?.missile ?? 5} restants</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {joueurs.slice(0, 8).map((j, i) => {
                const [bg, color] = COLORS[i % COLORS.length]
                const isTgt = targeted === j.id
                return (
                  <button key={j.id} onClick={() => setTargeted(isTgt ? null : j.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', background: isTgt ? 'var(--r-dim)' : 'var(--bg3)',
                    border: `1.5px solid ${isTgt ? 'var(--r)' : 'transparent'}`,
                    borderRadius: 'var(--Rs)', cursor: 'pointer', transition: 'all .15s',
                  }}>
                    <div className="av" style={{ width: 28, height: 28, background: bg, color, fontSize: 10 }}>
                      {j.initiales}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: isTgt ? 'var(--r)' : 'var(--tx)' }}>
                      {j.nom?.split(' ')[0]}
                    </div>
                  </button>
                )
              })}
            </div>
            {targeted && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--r-dim)', border: '1px solid var(--r-b)', borderRadius: 'var(--Rs)', fontSize: 12, color: 'var(--r)', fontWeight: 500 }}>
                🎯 Cible sélectionnée — choisis maintenant le match dans l'onglet Pronos
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
