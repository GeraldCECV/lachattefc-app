import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, getDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'

export default function Pronos() {
  const { profil, user } = useUser()
  const [journee, setJournee] = useState(null)
  const [pronos, setPronos] = useState({}) // { matchScorer: '2-1', matchesL1: ['1','N',...], matchEuro: '2' }
  const [existingProno, setExistingProno] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scorerH, setScorerH] = useState(0)
  const [scorerA, setScorerA] = useState(0)
  const [deadlinePassed, setDeadlinePassed] = useState(false)

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(collection(db, 'journees'), orderBy('numero', 'desc'), limit(1)))
      if (snap.empty) { setLoading(false); return }
      const jDoc = snap.docs[0]
      const j = { id: jDoc.id, ...jDoc.data() }
      setJournee(j)

      // Vérifier deadline
      if (j.deadline) {
        const dl = new Date(j.deadline.seconds * 1000)
        setDeadlinePassed(new Date() > dl)
      }

      // Charger prono existant
      if (user) {
        const pronoDoc = await getDoc(doc(db, 'journees', jDoc.id, 'pronos', user.uid))
        if (pronoDoc.exists()) {
          const data = pronoDoc.data()
          setExistingProno(data)
          setPronos(data)
          if (data.matchScorer) {
            const parts = data.matchScorer.split('-')
            setScorerH(parseInt(parts[0]) || 0)
            setScorerA(parseInt(parts[1]) || 0)
          }
        } else {
          setPronos({ matchesL1: Array(8).fill(null), matchEuro: null, matchScorer: null })
        }
      }
      setLoading(false)
    }
    load()
  }, [user])

  const setL1 = (idx, val) => {
    setPronos(prev => {
      const arr = [...(prev.matchesL1 || Array(8).fill(null))]
      arr[idx] = val
      return { ...prev, matchesL1: arr }
    })
  }

  const countFilled = () => {
    let n = 0
    if (pronos.matchScorer) n++
    if (pronos.matchEuro) n++
    ;(pronos.matchesL1 || []).forEach(p => { if (p) n++ })
    return n
  }

  const handleSubmit = async () => {
    if (!user || !journee) return
    setSaving(true)
    try {
      const data = {
        ...pronos,
        matchScorer: `${scorerH}-${scorerA}`,
        joueurId: user.uid,
        joueurNom: profil?.nom,
        soumisLe: serverTimestamp(),
      }
      await setDoc(doc(db, 'journees', journee.id, 'pronos', user.uid), data)
      setExistingProno(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch(e) {
      alert('Erreur : ' + e.message)
    }
    setSaving(false)
  }

  const total = 10
  const filled = countFilled()
  const pct = Math.round(filled / total * 100)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" style={{ width: 24, height: 24 }}></div>
    </div>
  )

  if (!journee) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)' }}>Aucune journée en cours</div>
      <div style={{ fontSize: 13, color: 'var(--tx3)', marginTop: 6 }}>Le bureau n'a pas encore ouvert la prochaine journée</div>
    </div>
  )

  if (deadlinePassed && !existingProno) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px 32px', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, background: 'var(--r-dim)', border: '1px solid var(--r-b)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 20 }}>🔒</div>
      <div style={{ fontFamily: 'var(--D)', fontSize: 32, letterSpacing: '.04em', color: 'var(--tx)', marginBottom: 8 }}>Trop tard !</div>
      <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 20 }}>
        La deadline de la journée {journee.numero} est passée.<br />
        Tu es marqué <strong style={{ color: 'var(--r)' }}>ABS</strong> — pénalité −1pt.
      </div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--R)', padding: '14px 20px', width: '100%', textAlign: 'left' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>Prochaine journée</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>J{journee.numero + 1} — ouverture lundi</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>Tu recevras une notification dès l'ouverture</div>
      </div>
    </div>
  )

  if (deadlinePassed && existingProno) return (
    <div className="scroll-area">
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontFamily: 'var(--D)', fontSize: 28, letterSpacing: '.04em' }}>📜 Tes Pronos</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 2 }}>J{journee.numero} · Fermée — en attente des résultats</div>
      </div>
      <div style={{ margin: '14px 16px', background: 'var(--g-dim)', border: '1px solid var(--g-b)', borderRadius: 'var(--Rs)', padding: '12px 16px', fontSize: 13, color: 'var(--g)', fontWeight: 600 }}>
        ✅ Pronos bien enregistrés — résultats disponibles après le week-end
      </div>
      {renderResultView(journee, existingProno)}
    </div>
  )

  return (
    <div className="scroll-area">
      {/* Header */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'var(--D)', fontSize: 28, letterSpacing: '.04em' }}>📜 Pronos</div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 2 }}>
              Journée {journee.numero} · {deadline(journee)}
            </div>
          </div>
          {existingProno && <span className="pill pill-g">✅ Envoyés</span>}
        </div>
      </div>

      {saved && <div className="alert alert-g" style={{ margin: '12px 16px 0' }}>✅ Pronos enregistrés !</div>}

      {/* Progress */}
      <div style={{ margin: '14px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{filled} / {total} matchs renseignés</span>
          <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{total - filled} restants</span>
        </div>
        <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--g)', borderRadius: 2, transition: 'width .4s' }}></div>
        </div>
      </div>

      {/* SCORER */}
      <div className="section-lbl">🎯 Match à scorer — Ligue 1</div>
      <div style={{ margin: '0 16px 10px', background: 'linear-gradient(135deg, var(--bg2), #0d1620)', border: '1px solid var(--b-b)', borderRadius: 'var(--R)', padding: '16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--b)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>
          Choisi par le bureau
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
          {journee.matchScorer?.dom || '?'} — {journee.matchScorer?.ext || '?'}
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--tx3)' }}>
            {journee.matchScorer?.jour} {journee.matchScorer?.heure}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 12, overflow: 'hidden' }}>
            <button style={{ width: 44, height: 44, border: 'none', background: 'none', color: 'var(--tx2)', fontSize: 22, cursor: 'pointer' }} onClick={() => setScorerH(Math.max(0, scorerH - 1))}>−</button>
            <div style={{ width: 40, textAlign: 'center', fontFamily: 'var(--D)', fontSize: 28, color: 'var(--tx)', letterSpacing: '.04em' }}>{scorerH}</div>
            <button style={{ width: 44, height: 44, border: 'none', background: 'none', color: 'var(--tx2)', fontSize: 22, cursor: 'pointer' }} onClick={() => setScorerH(Math.min(9, scorerH + 1))}>+</button>
          </div>
          <div style={{ fontSize: 20, color: 'var(--tx3)' }}>—</div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 12, overflow: 'hidden' }}>
            <button style={{ width: 44, height: 44, border: 'none', background: 'none', color: 'var(--tx2)', fontSize: 22, cursor: 'pointer' }} onClick={() => setScorerA(Math.max(0, scorerA - 1))}>−</button>
            <div style={{ width: 40, textAlign: 'center', fontFamily: 'var(--D)', fontSize: 28, color: 'var(--tx)', letterSpacing: '.04em' }}>{scorerA}</div>
            <button style={{ width: 44, height: 44, border: 'none', background: 'none', color: 'var(--tx2)', fontSize: 22, cursor: 'pointer' }} onClick={() => setScorerA(Math.min(9, scorerA + 1))}>+</button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx3)', textAlign: 'center', marginTop: 10 }}>
          Score exact = 3pts · Bon écart = 2pts · Bonne issue = 1pt
        </div>
      </div>

      {/* L1 MATCHS */}
      <div className="section-lbl">🇫🇷 Ligue 1 — 8 matchs 1N2</div>
      {(journee.matchesL1 || []).map((m, i) => {
        if (!m?.dom) return null
        const sel = pronos.matchesL1?.[i]
        return (
          <div key={i} style={{ margin: '0 16px 8px', background: 'var(--bg2)', border: `1px solid ${sel ? 'var(--g-b)' : 'var(--bd)'}`, borderRadius: 'var(--R)', padding: '13px 14px', transition: 'border-color .2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.dom} — {m.ext}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{m.jour} {m.heure}</div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {['1','N','2'].map(v => (
                <button key={v} onClick={() => setL1(i, v)} style={{
                  flex: 1, height: 42, borderRadius: 10,
                  border: `1.5px solid ${sel === v ? (v==='1'?'var(--b)':v==='N'?'var(--a)':'var(--p)') : 'var(--bd2)'}`,
                  background: sel === v ? (v==='1'?'var(--b-dim)':v==='N'?'var(--a-dim)':'var(--p-dim)') : 'var(--bg3)',
                  color: sel === v ? (v==='1'?'var(--b)':v==='N'?'var(--a)':'var(--p)') : 'var(--tx3)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  transition: 'all .15s',
                }}>
                  {v === '1' ? '🏠 1' : v === 'N' ? '= N' : '✈ 2'}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {/* EURO */}
      <div className="section-lbl">🌍 Match européen — 1N2</div>
      {journee.matchEuro?.dom && (
        <div style={{ margin: '0 16px 10px', background: 'rgba(249,115,22,.03)', border: `1px solid ${pronos.matchEuro ? 'var(--g-b)' : 'var(--o-b)'}`, borderRadius: 'var(--R)', padding: '13px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {journee.matchEuro.dom} — {journee.matchEuro.ext}
              <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--o-dim)', color: 'var(--o)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                {journee.matchEuro.ligue}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{journee.matchEuro.jour} {journee.matchEuro.heure}</div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {['1','N','2'].map(v => (
              <button key={v} onClick={() => setPronos(p => ({ ...p, matchEuro: v }))} style={{
                flex: 1, height: 42, borderRadius: 10,
                border: `1.5px solid ${pronos.matchEuro === v ? (v==='1'?'var(--b)':v==='N'?'var(--a)':'var(--p)') : 'var(--bd2)'}`,
                background: pronos.matchEuro === v ? (v==='1'?'var(--b-dim)':v==='N'?'var(--a-dim)':'var(--p-dim)') : 'var(--bg3)',
                color: pronos.matchEuro === v ? (v==='1'?'var(--b)':v==='N'?'var(--a)':'var(--p)') : 'var(--tx3)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
              }}>
                {v === '1' ? '🏠 1' : v === 'N' ? '= N' : '✈ 2'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BONUS strip */}
      <div style={{ margin: '4px 16px 10px', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--R)', padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
          Bonus disponibles · Non utilisables sur le scorer
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {[
            { ico: '🎯', lbl: `Missile ×${profil?.bonus?.missile ?? 5}`, color: 'var(--r)' },
            { ico: '🎰', lbl: `Jackpot ×${profil?.bonus?.jackpot ?? 3}`, color: 'var(--a)' },
            { ico: '2️⃣', lbl: `DC ×${profil?.bonus?.doubleChance ?? 4}`, color: 'var(--p)' },
          ].map(b => (
            <div key={b.lbl} style={{ padding: '5px 12px', borderRadius: 999, border: `1.5px dashed ${b.color}44`, fontSize: 12, fontWeight: 600, color: b.color, opacity: .8 }}>
              {b.ico} {b.lbl}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>Gestion des bonus dans l'onglet 🎁</div>
      </div>

      {/* CTA */}
      <div style={{ padding: '4px 16px 24px' }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || filled < 10}>
          {saving
            ? <><div className="spinner" style={{ width: 18, height: 18, borderTopColor: '#000' }}></div> Envoi...</>
            : existingProno
              ? '🔄 Mettre à jour mes pronos'
              : `📤 Envoyer mes pronos (${filled}/10)`
          }
        </button>
        {filled < 10 && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--tx3)', marginTop: 8 }}>
          Renseigne les {10 - filled} matchs restants pour envoyer
        </div>}
      </div>
    </div>
  )
}

function deadline(j) {
  if (!j?.deadline) return ''
  const dl = new Date(j.deadline.seconds * 1000)
  return `Fermeture ${dl.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} ${dl.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

function renderResultView(journee, prono) {
  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)', marginBottom: 10 }}>
        Ton prono scorer : {prono.matchScorer || '—'}
      </div>
      {(journee.matchesL1 || []).map((m, i) => m?.dom && (
        <div key={i} className="match-row">
          <div className="match-info">
            <div className="match-name">{m.dom} — {m.ext}</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx2)' }}>
            {prono.matchesL1?.[i] || '—'}
          </span>
        </div>
      ))}
      {journee.matchEuro?.dom && (
        <div className="match-row">
          <div className="match-info">
            <div className="match-name">🌍 {journee.matchEuro.dom} — {journee.matchEuro.ext}</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx2)' }}>{prono.matchEuro || '—'}</span>
        </div>
      )}
    </div>
  )
}
