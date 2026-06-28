import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, addDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useUser } from '../App'
import TeamLogo from '../components/TeamLogo'
import { translateTeam } from '../utils/teamName'

// ── Helpers ──
const RESULT_COLORS = {
  '1': { sel:'var(--b)', dim:'var(--b-dim)', label:'1' },
  'N': { sel:'var(--a)', dim:'var(--a-dim)', label:'N' },
  '2': { sel:'var(--p)', dim:'var(--p-dim)', label:'2' },
}

function PronoBtn({ val, selected, onClick, disabled }) {
  const c = RESULT_COLORS[val]
  const isSel = selected === val
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex:1, height:42, borderRadius:10,
      border:`1.5px solid ${isSel ? c.sel : 'rgba(255,255,255,.13)'}`,
      background: isSel ? c.dim : 'rgba(255,255,255,.04)',
      color: isSel ? c.sel : 'rgba(255,255,255,.4)',
      fontSize:14, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer',
      transition:'all .15s', opacity: disabled ? .5 : 1,
    }}>
      {c.label}
    </button>
  )
}

function DcBtn({ val, selected, onClick }) {
  const c = RESULT_COLORS[val]
  const isSel = selected?.includes(val)
  return (
    <button onClick={onClick} style={{
      flex:1, height:42, borderRadius:10,
      border:`1.5px solid ${isSel ? c.sel : 'rgba(255,255,255,.13)'}`,
      background: isSel ? c.dim : 'rgba(255,255,255,.04)',
      color: isSel ? c.sel : 'rgba(255,255,255,.4)',
      fontSize:14, fontWeight:700, cursor:'pointer', transition:'all .15s',
    }}>
      {c.label} {isSel ? '✓' : ''}
    </button>
  )
}

export default function Pronos() {
  const { profil, user } = useUser()
  const [journee, setJournee] = useState(null)
  const [pronos, setPronos] = useState({ matchesL1: Array(8).fill(null), matchEuro: null, matchScorer: null })
  const [existingProno, setExistingProno] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scorerH, setScorerH] = useState(0)
  const [scorerA, setScorerA] = useState(0)
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const journeeAVenir = journee?.statut === 'a-venir'

  // Bonus state
  const [bonusStock, setBonusStock] = useState({ missile:3, jackpot:3, doubleChance:4 })
  const [activeBonus, setActiveBonus] = useState(null) // { type:'jackpot'|'dc'|'missile', matchKey: null }
  const [jackpotMatch, setJackpotMatch] = useState(null) // 'scorer'|'l1_0'|...|'euro'
  const [dcMatch, setDcMatch] = useState(null) // 'l1_0' etc
  const [dcChoices, setDcChoices] = useState([]) // ['1','N'] max 2
  const [missileData, setMissileData] = useState({ cible:null, matchKey:null, prono:null })
  const [missileUsed, setMissileUsed] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [joueurs, setJoueurs] = useState([])
  const [showBonusPanel, setShowBonusPanel] = useState(null) // matchKey
  const [showMissileModal, setShowMissileModal] = useState(false)
  const [missileStep, setMissileStep] = useState(1) // 1=cible 2=match 3=prono
  const [missileMsg, setMissileMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      // Charger la première journée ouverte
      let snap = await getDocs(query(collection(db,'journees'), orderBy('numero','asc')))
      // Trouver la première journée ouverte dont la deadline n'est pas passée
      const now = new Date()
      const openDocs = snap.docs.filter(d => {
        const data = d.data()
        if (data.statut === 'resultats') return false
        const dl = data.deadline ? new Date(data.deadline.seconds * 1000) : null
        return data.statut !== 'fermee' && (!dl || dl > now)
      })
      if (openDocs.length === 0) { setLoading(false); return }
      snap = { docs: [openDocs[0]], empty: false }
      if (snap.empty) { setLoading(false); return }
      const jDoc = snap.docs[0]
      const jRaw = { id:jDoc.id, ...jDoc.data() }
      // Normaliser CDM : mapper matchesCDM → matchesL1 pour compatibilité
      const j = jRaw.type === 'cdm'
        ? { ...jRaw, matchesL1: (jRaw.matchesCDM || []).map(m => ({ ...m, type: 'cdm' })), matchScorer: null, matchEuro: null }
        : jRaw
      setJournee(j)
      if (j.deadline) setDeadlinePassed(new Date() > new Date(j.deadline.seconds*1000))

      if (user) {
        // Charger prono existant
        const pronoDoc = await getDoc(doc(db,'journees',jDoc.id,'pronos',user.uid))
        if (pronoDoc.exists()) {
          const data = pronoDoc.data()
          setExistingProno(data)
          setPronos(data)
          if (data.matchScorer) {
            const parts = data.matchScorer.split('-')
            setScorerH(parseInt(parts[0])||0)
            setScorerA(parseInt(parts[1])||0)
          }
          if (data.jackpotMatch) setJackpotMatch(data.jackpotMatch)
          if (data.dcMatch) { setDcMatch(data.dcMatch); setDcChoices(data.dcChoices||[]) }
        }
        // Charger bonus
        const joueurDoc = await getDoc(doc(db,'joueurs',user.uid))
        if (joueurDoc.exists()) setBonusStock(joueurDoc.data().bonus || { missile:3, jackpot:3, doubleChance:4 })
        // Charger joueurs pour missile
        const jSnap = await getDocs(collection(db,'joueurs'))
        setJoueurs(jSnap.docs.map(d=>({id:d.id,...d.data()})).filter(j=>j.id!==user.uid))
      }
      setLoading(false)
    }
    load()
  }, [user])

  const setL1 = (idx, val) => {
    setPronos(prev => {
      const arr = [...(prev.matchesL1||Array(8).fill(null))]
      arr[idx] = val
      return {...prev, matchesL1:arr}
    })
  }

  const toggleDc = (val) => {
    setDcChoices(prev => {
      if (prev.includes(val)) return prev.filter(v=>v!==val)
      if (prev.length >= 2) return [prev[1], val]
      return [...prev, val]
    })
  }

  const countFilled = () => {
    let n = 0
    if (journee?.type === 'cdm') {
      ;(pronos.matchesL1||[]).forEach(p => { if (p) n++ })
      return n
    }
    if (pronos.matchScorer || (scorerH !== null)) n++
    if (pronos.matchEuro) n++
    ;(pronos.matchesL1||[]).forEach(p => { if (p) n++ })
    return n
  }

  const total = journee?.type === 'cdm' ? (journee.matchesCDM?.length || journee.matchesL1?.length || 6) : 10

  const handleSubmit = async () => {
    if (!user || !journee) return
    setSaving(true)
    try {
      // ── Si mise à jour : supprimer l'ancien missile lancé si pas de nouveau missile ──
      if (existingProno && !missileUsed) {
        const oldMissilesSnap = await getDocs(collection(db,'journees',journee.id,'missiles'))
        for (const mDoc of oldMissilesSnap.docs) {
          if (mDoc.data().lanceur === user.uid) {
            await deleteDoc(doc(db,'journees',journee.id,'missiles',mDoc.id))
            // Rembourser le stock missile
            const jSnap = await getDoc(doc(db,'joueurs',user.uid))
            const currentStock = jSnap.data()?.bonus?.missile || 0
            await updateDoc(doc(db,'joueurs',user.uid), { 'bonus.missile': currentStock + 1 })
            setBonusStock(prev => ({ ...prev, missile: prev.missile + 1 }))
          }
        }
      }

      // ── Vérifier si un missile a été posé sur ce joueur ──
      // Si oui, écraser le prono concerné avant de sauvegarder
      const missilesSnap = await getDocs(collection(db,'journees',journee.id,'missiles'))
      const missilesSurMoi = missilesSnap.docs
        .map(d => ({ id:d.id, ...d.data() }))
        .filter(m => m.cible === user.uid && !m.applique)

      const isCDM = journee.type === 'cdm'
      const pronosFinaux = isCDM ? {
        ...pronos,
        matchesCDM: [...(pronos.matchesL1 || Array(journee.matchesCDM?.length || 8).fill(null))],
        matchScorer: null,
        matchEuro: null,
      } : {
        ...pronos,
        matchScorer: `${scorerH}-${scorerA}`,
        matchesL1: [...(pronos.matchesL1 || Array(8).fill(null))],
      }

      // Appliquer les missiles reçus
      for (const missile of missilesSurMoi) {
        const { matchKey, pronoImpose } = missile
        if (matchKey.startsWith('l1_') || matchKey.startsWith('cdm_')) {
          const prefix = matchKey.startsWith('cdm_') ? 'cdm_' : 'l1_'
          const i = parseInt(matchKey.replace(prefix, ''))
          pronosFinaux.matchesL1[i] = pronoImpose
        } else if (matchKey === 'euro') {
          pronosFinaux.matchEuro = pronoImpose
        }
        // Marquer le missile comme appliqué
        await updateDoc(doc(db,'journees',journee.id,'missiles',missile.id), { applique: true })
      }

      // ── Vérifier le stock bonus côté serveur ──
      const joueurSnap = await getDoc(doc(db,'joueurs',user.uid))
      const stockServeur = joueurSnap.exists() ? joueurSnap.data().bonus : { missile:0, jackpot:0, doubleChance:0 }

      // Invalider jackpot si stock épuisé ou posé sur le scorer
      const jackpotValide = jackpotMatch && jackpotMatch !== 'scorer' && (stockServeur.jackpot > 0)
      const dcValide = dcMatch && dcMatch !== 'scorer' && dcChoices.length === 2 && (stockServeur.doubleChance > 0)

      const data = {
        ...pronosFinaux,
        joueurId: user.uid,
        joueurNom: profil?.nom,
        soumisLe: serverTimestamp(),
        jackpotMatch: jackpotValide ? jackpotMatch : null,
        dcMatch: dcValide ? dcMatch : null,
        dcChoices: dcValide ? dcChoices : null,
        missilesRecus: missilesSurMoi.length > 0 ? missilesSurMoi.map(m => m.id) : null,
      }
      await setDoc(doc(db,'journees',journee.id,'pronos',user.uid), data)

      // Débiter les bonus utilisés au moment de l'envoi
      const bonusUpdate = {}
      if (jackpotValide && !existingProno?.jackpotMatch) {
        bonusUpdate['bonus.jackpot'] = Math.max(0, stockServeur.jackpot - 1)
        setBonusStock(prev => ({ ...prev, jackpot: Math.max(0, prev.jackpot - 1) }))
      }
      // Rembourser jackpot si désactivé lors d'un update
      if (!jackpotValide && existingProno?.jackpotMatch) {
        bonusUpdate['bonus.jackpot'] = Math.min(stockServeur.jackpot + 1, 3)
        setBonusStock(prev => ({ ...prev, jackpot: Math.min(prev.jackpot + 1, 3) }))
      }
      if (dcValide && !existingProno?.dcMatch) {
        bonusUpdate['bonus.doubleChance'] = Math.max(0, stockServeur.doubleChance - 1)
        setBonusStock(prev => ({ ...prev, doubleChance: Math.max(0, prev.doubleChance - 1) }))
      }
      // Rembourser DC si désactivée lors d'un update
      if (!dcValide && existingProno?.dcMatch) {
        bonusUpdate['bonus.doubleChance'] = Math.min(stockServeur.doubleChance + 1, 4)
        setBonusStock(prev => ({ ...prev, doubleChance: Math.min(prev.doubleChance + 1, 4) }))
      }
      // Débiter le missile si utilisé cette session
      if (missileUsed) {
        bonusUpdate['bonus.missile'] = Math.max(0, stockServeur.missile - 1)
      }
      if (Object.keys(bonusUpdate).length > 0) {
        await updateDoc(doc(db,'joueurs',user.uid), bonusUpdate)
      }

      setExistingProno(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch(e) { alert('Erreur : '+e.message) }
    setSaving(false)
  }

  const submitMissile = async () => {
    if (!missileData.cible || !missileData.matchKey || !missileData.prono) {
      setMissileMsg('Complète toutes les étapes')
      return
    }
    try {
      // Vérifier doublon (même cible + même match)
      const existingMissiles = await getDocs(collection(db,'journees',journee.id,'missiles'))
      const doublon = existingMissiles.docs.find(d => {
        const m = d.data()
        return m.lanceur === user.uid && m.cible === missileData.cible && m.matchKey === missileData.matchKey
      })
      if (doublon) {
        setMissileMsg('⚠️ Tu as déjà posé un missile sur ce joueur pour ce match !')
        return
      }

      await addDoc(collection(db,'journees',journee.id,'missiles'), {
        lanceur: user.uid,
        lanceurNom: profil?.nom,
        cible: missileData.cible,
        matchKey: missileData.matchKey,
        pronoImpose: missileData.prono,
        poseLe: serverTimestamp(),
        journeeId: journee.id,
        applique: false,
      })
      // Ne pas débiter immédiatement - sera débité à l'envoi des pronos
      setMissileUsed(true)
      // Réduire l'affichage local pour empêcher un 2ème missile (sans toucher Firestore)
      setBonusStock(prev => ({ ...prev, missile: prev.missile - 1 }))
      setMissileMsg('✅ Missile lancé !')
      setTimeout(() => { setShowMissileModal(false); setMissileMsg(''); setMissileData({cible:null,matchKey:null,prono:null}); setMissileStep(1) }, 1500)
    } catch(e) { setMissileMsg('Erreur : '+e.message) }
  }

  const filled = countFilled()
  const pct = Math.round(filled/total*100)

  const matchLabel = (key) => {
    if (!journee) return key
    if (key === 'scorer') return `⚽ ${journee.matchScorer?.dom||'?'} — ${journee.matchScorer?.ext||'?'}`
    if (key === 'euro') return `🌍 ${journee.matchEuro?.dom||'?'} — ${journee.matchEuro?.ext||'?'}`
    const i = parseInt(key.replace('l1_',''))
    const m = journee.matchesL1?.[i]
    return m ? `${translateTeam(m.dom)} — ${translateTeam(m.ext)}` : key
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner" style={{width:24,height:24}}></div></div>

  if (!journee) return (
    <div style={{padding:40,textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:12}}>📋</div>
      <div style={{fontSize:16,fontWeight:600,color:'var(--tx)'}}>Aucune journée en cours</div>
      <div style={{fontSize:13,color:'var(--tx3)',marginTop:6}}>Le bureau n'a pas encore ouvert la prochaine journée</div>
    </div>
  )

  // ── MULTIPLEX J34 ──
  if (journee.type === 'multiplex') {
    const matchesL1 = journee.matchesL1 || []
    const [scores, setScores] = useState(matchesL1.map(() => ({ h: 0, a: 0 })))

    const handleMultiplexSubmit = async () => {
      setSaving(true)
      try {
        const data = {
          joueurId: user.uid,
          joueurNom: profil?.nom,
          soumisLe: serverTimestamp(),
          matchesMultiplex: scores.map(s => `${s.h}-${s.a}`),
          type: 'multiplex',
        }
        await setDoc(doc(db,'journees',journee.id,'pronos',user.uid), data)
        setExistingProno(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch(e) { alert('Erreur : '+e.message) }
      setSaving(false)
    }

    return (
      <div className="scroll-area">
        <div style={{padding:'16px 20px 0'}}>
          <div style={{fontFamily:'var(--D)',fontSize:28,letterSpacing:'.04em',color:'var(--g)'}}>🏆 Journée Multiplex</div>
          <div style={{fontSize:13,color:'var(--tx2)',marginTop:2}}>J{journee.numero} · Tous les matchs à scorer simultanément · Pas de bonus</div>
        </div>
        {saved && <div className="alert alert-g" style={{margin:'12px 16px 0'}}>✅ Pronos envoyés !</div>}
        <div style={{margin:'12px 16px 0',padding:'10px 14px',background:'rgba(155,226,45,.06)',border:'1px solid var(--g-b)',borderRadius:'var(--Rs)',fontSize:12,color:'var(--g)',fontWeight:700}}>
          ⚽ Multiplex — tous les matchs débutent en même temps. Score exact = 3pts · Bon écart = 2pts · Bonne issue = 1pt
        </div>
        <div className="section-lbl" style={{padding:'14px 20px 8px'}}>{journee.type==='cdm'?'🌍 CDM 2026':'🇫🇷 Ligue 1'} — {matchesL1.length} matchs à scorer</div>
        {matchesL1.map((m, i) => (
          <div key={i} style={{margin:'0 16px 8px',background:'rgba(155,226,45,.04)',border:'1px solid var(--g-b)',borderRadius:'var(--R)',padding:'13px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
              <TeamLogo name={m.dom} size={22} />
              <span style={{fontSize:14,fontWeight:700}}>{translateTeam(m.dom)}</span>
              <span style={{color:'var(--tx3)'}}>—</span>
              <span style={{fontSize:14,fontWeight:700}}>{translateTeam(m.ext)}</span>
              <TeamLogo name={m.ext} size={22} />
              <span style={{fontSize:11,color:'var(--tx3)',marginLeft:'auto'}}>{m.jour} {m.heure}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <Stepper val={scores[i]?.h||0} onChange={v => setScores(prev => prev.map((s,j) => j===i?{...s,h:v}:s))} />
              <div style={{fontSize:20,color:'var(--tx3)'}}>—</div>
              <Stepper val={scores[i]?.a||0} onChange={v => setScores(prev => prev.map((s,j) => j===i?{...s,a:v}:s))} />
            </div>
          </div>
        ))}
        <div style={{padding:'4px 16px 24px'}}>
          <button className="btn btn-primary" onClick={handleMultiplexSubmit} disabled={saving}>
            {saving ? <><div className="spinner" style={{width:18,height:18,borderTopColor:'#000'}}></div> Envoi...</> : existingProno ? '🔄 Mettre à jour' : '📤 Envoyer mes pronos Multiplex'}
          </button>
        </div>
      </div>
    )
  }

  // ── BOXING DAY ──
  if (journee.type === 'boxing-day') {
    const matchesBoxing = journee.matchesBoxing || []
    const [scores, setScores] = useState(matchesBoxing.map(() => ({ h: 0, a: 0 })))

    const handleBoxingSubmit = async () => {
      setSaving(true)
      try {
        const data = {
          joueurId: user.uid,
          joueurNom: profil?.nom,
          soumisLe: serverTimestamp(),
          matchesBoxing: scores.map(s => `${s.h}-${s.a}`),
          type: 'boxing-day',
        }
        await setDoc(doc(db,'journees',journee.id,'pronos',user.uid), data)
        setExistingProno(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch(e) { alert('Erreur : '+e.message) }
      setSaving(false)
    }

    return (
      <div className="scroll-area">
        <div style={{padding:'16px 20px 0'}}>
          <div style={{fontFamily:'var(--D)',fontSize:28,letterSpacing:'.04em',color:'var(--a)'}}>🎄 Boxing Day</div>
          <div style={{fontSize:13,color:'var(--tx2)',marginTop:2}}>26 décembre · 10 matchs PL · Tous à scorer · Pas de bonus</div>
        </div>
        {saved && <div className="alert alert-g" style={{margin:'12px 16px 0'}}>✅ Pronos envoyés !</div>}
        <div className="section-lbl" style={{padding:'14px 20px 8px'}}>🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League — 10 matchs à scorer</div>
        {matchesBoxing.map((m, i) => (
          <div key={i} style={{margin:'0 16px 8px',background:'rgba(251,191,36,.04)',border:'1px solid var(--a-b)',borderRadius:'var(--R)',padding:'13px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
              <TeamLogo name={m.dom} size={22} />
              <span style={{fontSize:14,fontWeight:700}}>{translateTeam(m.dom)}</span>
              <span style={{color:'var(--tx3)'}}>—</span>
              <span style={{fontSize:14,fontWeight:700}}>{translateTeam(m.ext)}</span>
              <TeamLogo name={m.ext} size={22} />
              <span style={{fontSize:11,color:'var(--tx3)',marginLeft:'auto'}}>{m.jour} {m.heure}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <Stepper val={scores[i]?.h||0} onChange={v => setScores(prev => prev.map((s,j) => j===i?{...s,h:v}:s))} />
              <div style={{fontSize:20,color:'var(--tx3)'}}>—</div>
              <Stepper val={scores[i]?.a||0} onChange={v => setScores(prev => prev.map((s,j) => j===i?{...s,a:v}:s))} />
            </div>
            <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',marginTop:8}}>Score exact = 3pts · Bon écart = 2pts · Bonne issue = 1pt</div>
          </div>
        ))}
        <div style={{padding:'4px 16px 24px'}}>
          <button className="btn btn-primary" onClick={handleBoxingSubmit} disabled={saving}>
            {saving ? <><div className="spinner" style={{width:18,height:18,borderTopColor:'#000'}}></div> Envoi...</> : existingProno ? '🔄 Mettre à jour' : '🎄 Envoyer mes pronos Boxing Day'}
          </button>
        </div>
      </div>
    )
  }

  if (deadlinePassed && !existingProno) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:'24px 32px',textAlign:'center'}}>
      <div style={{width:80,height:80,background:'var(--r-dim)',border:'1px solid var(--r-b)',borderRadius:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,marginBottom:20}}>🔒</div>
      <div style={{fontFamily:'var(--D)',fontSize:32,letterSpacing:'.04em',color:'var(--tx)',marginBottom:8}}>Trop tard !</div>
      <div style={{fontSize:14,color:'var(--tx2)',lineHeight:1.6,marginBottom:20}}>
        La deadline de J{journee.numero} est passée.<br/>Tu es marqué <strong style={{color:'var(--r)'}}>ABS</strong> — pénalité −1pt.
      </div>
      <div style={{background:'var(--bg2)',border:'1px solid var(--bd)',borderRadius:'var(--R)',padding:'14px 20px',width:'100%',textAlign:'left'}}>
        <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Prochaine journée</div>
        <div style={{fontSize:14,fontWeight:600}}>J{journee.numero+1} — ouverture lundi</div>
      </div>
    </div>
  )

  return (
    <div className="scroll-area">

      {/* ── MISSILE MODAL ── */}
      {showMissileModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:500,overflowY:'scroll',WebkitOverflowScrolling:'touch',paddingBottom:100}}>
          <div style={{width:'100%',maxWidth:420,margin:'60px auto 0',background:'#0a0a0a',border:'1px solid var(--r-b)',borderRadius:20,padding:24,boxShadow:'0 8px 40px rgba(0,0,0,.8)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontFamily:'var(--D)',fontSize:26,letterSpacing:'.04em',color:'var(--r)'}}>🚀 Missile</div>
                <div style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>
                  {missileStep===1?'1/3 · Choisir la cible':missileStep===2?'2/3 · Choisir le match':'3/3 · Choisir le prono à imposer'}
                </div>
              </div>
              <button onClick={()=>{setShowMissileModal(false);setMissileStep(1);setMissileData({cible:null,matchKey:null,prono:null})}} style={{background:'var(--bg3)',border:'1px solid var(--bd)',borderRadius:8,padding:'6px 10px',color:'var(--tx2)',cursor:'pointer',fontSize:13}}>✕</button>
            </div>

            {missileMsg && <div className={`alert ${missileMsg.startsWith('✅')?'alert-g':'alert-r'}`} style={{marginBottom:12}}>{missileMsg}</div>}

            {/* Step 1 — Cible */}
            {missileStep===1 && (
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                  {joueurs.map(j => (
                    <button key={j.id} onClick={()=>setMissileData(p=>({...p,cible:j.id}))} style={{
                      display:'flex',alignItems:'center',gap:8,padding:'10px 12px',
                      background:missileData.cible===j.id?'var(--r-dim)':'var(--bg3)',
                      border:`1.5px solid ${missileData.cible===j.id?'var(--r)':'transparent'}`,
                      borderRadius:'var(--Rs)',cursor:'pointer',transition:'all .15s',
                    }}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'var(--bg4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'var(--tx2)',flexShrink:0}}>{j.initiales}</div>
                      <div style={{fontSize:12,fontWeight:600,color:missileData.cible===j.id?'var(--r)':'var(--tx)'}}>{j.nom?.split(' ')[0]}</div>
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" style={{width:'100%',height:48}} onClick={()=>missileData.cible&&(setMissileStep(2),setMissileMsg(''))} disabled={!missileData.cible}>
                  Continuer →
                </button>
              </>
            )}

            {/* Step 2 — Match */}
            {missileStep===2 && (
              <>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                  {[
                    ...(journee.matchesL1||[]).map((m,i)=>m?.dom?{key: journee.type==='cdm'?`cdm_${i}`:`l1_${i}`,label:`${translateTeam(m.dom)} — ${translateTeam(m.ext)}`}:null).filter(Boolean),
                    journee.matchEuro?.dom ? {key:'euro',label:`🌍 ${journee.matchEuro.dom} — ${journee.matchEuro.ext}`} : null,
                  ].filter(Boolean).map(m => (
                    <button key={m.key} onClick={()=>setMissileData(p=>({...p,matchKey:m.key}))} style={{
                      padding:'11px 14px',textAlign:'left',
                      background:missileData.matchKey===m.key?'var(--r-dim)':'var(--bg3)',
                      border:`1.5px solid ${missileData.matchKey===m.key?'var(--r)':'transparent'}`,
                      borderRadius:'var(--Rs)',cursor:'pointer',transition:'all .15s',
                      fontSize:13,fontWeight:500,color:missileData.matchKey===m.key?'var(--r)':'var(--tx)',
                    }}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-secondary" onClick={()=>setMissileStep(1)}>← Retour</button>
                  <button className="btn btn-primary" style={{flex:1}} onClick={()=>missileData.matchKey&&(setMissileStep(3),setMissileMsg(''))} disabled={!missileData.matchKey}>
                    Continuer →
                  </button>
                </div>
              </>
            )}

            {/* Step 3 — Prono à imposer */}
            {missileStep===3 && (
              <>
                <div style={{fontSize:13,color:'var(--tx2)',marginBottom:12}}>{matchLabel(missileData.matchKey)}</div>
                <div style={{display:'flex',gap:8,marginBottom:16}}>
                  {['1','N','2'].map(v => (
                    <button key={v} onClick={()=>setMissileData(p=>({...p,prono:v}))} style={{
                      flex:1,height:48,borderRadius:10,
                      border:`1.5px solid ${missileData.prono===v?RESULT_COLORS[v].sel:'rgba(255,255,255,.13)'}`,
                      background:missileData.prono===v?RESULT_COLORS[v].dim:'rgba(255,255,255,.04)',
                      color:missileData.prono===v?RESULT_COLORS[v].sel:'rgba(255,255,255,.4)',
                      fontSize:15,fontWeight:700,cursor:'pointer',transition:'all .15s',
                    }}>
                      {RESULT_COLORS[v].label}
                    </button>
                  ))}
                </div>
                <div style={{background:'var(--r-dim)',border:'1px solid var(--r-b)',borderRadius:'var(--Rs)',padding:'10px 14px',fontSize:12,color:'var(--r)',marginBottom:16,lineHeight:1.5}}>
                  ⚠️ Ce prono remplacera celui de <strong>{joueurs.find(j=>j.id===missileData.cible)?.nom?.split(' ')[0]}</strong> sur ce match. Irréversible.
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-secondary" onClick={()=>setMissileStep(2)}>← Retour</button>
                  <button className="btn btn-danger" style={{flex:1,height:44}} onClick={submitMissile} disabled={!missileData.prono}>
                    🚀 Lancer le missile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{padding:'16px 20px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontFamily:'var(--D)',fontSize:28,letterSpacing:'.04em'}}>📜 Pronos</div>
            <div style={{fontSize:13,color:'var(--tx2)',marginTop:2}}>J{journee.numero} · {deadlineFmt(journee)}</div>
          </div>
          {existingProno && <span className="pill pill-g">✅ Envoyés</span>}
        </div>
      </div>

      {saved && <div className="alert alert-g" style={{margin:'12px 16px 0'}}>✅ Pronos enregistrés !</div>}

      {/* Progress */}
      <div style={{margin:'14px 16px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:500}}>{filled} / {total} matchs renseignés</span>
          <span style={{fontSize:12,color:'var(--tx3)'}}>{total-filled} restants</span>
        </div>
        <div style={{height:4,background:'var(--bg4)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:'var(--g)',borderRadius:2,transition:'width .4s'}}></div>
        </div>
      </div>

      {/* Bonus strip */}
      {!journee.scorerOnly && <div style={{margin:'12px 16px 0',display:'flex',gap:8,flexWrap:'wrap'}}>
        {/* Missile */}
        {bonusStock.missile > 0 && !deadlinePassed && (
          <button onClick={()=>setShowMissileModal(true)} style={{
            display:'flex',alignItems:'center',gap:6,padding:'6px 12px',
            background:'var(--r-dim)',border:'1px solid var(--r-b)',
            borderRadius:999,fontSize:12,fontWeight:700,color:'var(--r)',cursor:'pointer',
          }}>
            🚀 Missile ×{bonusStock.missile}
          </button>
        )}
        {/* Jackpot */}
        {bonusStock.jackpot > 0 && !deadlinePassed && (
          <button onClick={()=>setActiveBonus(activeBonus?.type==='jackpot'?null:{type:'jackpot'})} style={{
            display:'flex',alignItems:'center',gap:6,padding:'6px 12px',
            background:activeBonus?.type==='jackpot'?'var(--a-dim)':'rgba(255,255,255,.04)',
            border:`1px solid ${activeBonus?.type==='jackpot'?'var(--a-b)':'rgba(255,255,255,.1)'}`,
            borderRadius:999,fontSize:12,fontWeight:700,
            color:activeBonus?.type==='jackpot'?'var(--a)':'var(--tx3)',cursor:'pointer',
          }}>
            🎰 Jackpot ×{bonusStock.jackpot} {activeBonus?.type==='jackpot'?'— Sélectionne un match':''}
          </button>
        )}
        {/* Double Chance */}
        {bonusStock.doubleChance > 0 && !deadlinePassed && (
          <button onClick={()=>setActiveBonus(activeBonus?.type==='dc'?null:{type:'dc'})} style={{
            display:'flex',alignItems:'center',gap:6,padding:'6px 12px',
            background:activeBonus?.type==='dc'?'var(--p-dim)':'rgba(255,255,255,.04)',
            border:`1px solid ${activeBonus?.type==='dc'?'var(--p-b)':'rgba(255,255,255,.1)'}`,
            borderRadius:999,fontSize:12,fontWeight:700,
            color:activeBonus?.type==='dc'?'var(--p)':'var(--tx3)',cursor:'pointer',
          }}>
            2️⃣ DC ×{bonusStock.doubleChance} {activeBonus?.type==='dc'?'— Sélectionne un match':''}
          </button>
        )}
      </div>}

      {/* Bonus actifs recap */}
      {!journee.scorerOnly && (jackpotMatch || dcMatch) && (
        <div style={{margin:'8px 16px 0',padding:'10px 14px',background:'var(--bg2)',border:'1px solid var(--bd)',borderRadius:'var(--Rs)',fontSize:12}}>
          {jackpotMatch && <div style={{color:'var(--a)',fontWeight:700}}>🎰 Jackpot → {matchLabel(jackpotMatch)}</div>}
          {dcMatch && dcChoices.length===2 && <div style={{color:'var(--p)',fontWeight:700,marginTop:jackpotMatch?4:0}}>2️⃣ Double Chance → {matchLabel(dcMatch)} · {dcChoices.join(' ou ')}</div>}
        </div>
      )}

      {/* ── SCORER — masqué pour CDM ── */}
      {journee.type !== 'cdm' && journee.matchScorer?.dom && (
        <div style={{margin:'0 16px 10px',background:'linear-gradient(135deg, var(--bg2), #0d1620)',border:'1px solid var(--b-b)',borderRadius:'var(--R)',padding:'16px'}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--b)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:8}}>Choisi par le bureau</div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>
            {journee.matchScorer?.dom||'?'} — {journee.matchScorer?.ext||'?'}
            <span style={{marginLeft:8,fontSize:11,color:'var(--tx3)'}}>{journee.matchScorer?.jour} {journee.matchScorer?.heure}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
            <Stepper val={scorerH} onChange={setScorerH} />
            <div style={{fontSize:20,color:'var(--tx3)'}}>—</div>
            <Stepper val={scorerA} onChange={setScorerA} />
          </div>
          <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',marginTop:10}}>Score exact = 3pts · Bon écart = 2pts · Bonne issue = 1pt</div>
        </div>
      )}

      {/* ── MATCHS ── */}
      <div className="section-lbl" style={{padding:'8px 20px'}}>{journee.type==='cdm'?'🌍 CDM 2026':'🇫🇷 Ligue 1'} — {(journee.matchesL1||[]).length} matchs {journee.scorerOnly ? 'scorer' : '1N2'}</div>
      {(journee.matchesL1||[]).map((m, i) => {
        if (!m?.dom) return null
        const key = `l1_${i}`
        const sel = pronos.matchesL1?.[i]
        const isJP = jackpotMatch === key
        const isDC = dcMatch === key
        const isSelectingBonus = activeBonus?.type === 'jackpot' || activeBonus?.type === 'dc'

        // Mode scorer uniquement
        console.log('scorerOnly:', journee.scorerOnly, 'type:', typeof journee.scorerOnly)
        if (journee.scorerOnly) {
          const [domScore, extScore] = (sel || '-').split('-')
          return (
            <div key={i} style={{
              margin:'0 16px 8px',
              background: sel ? 'rgba(155,226,45,.04)' : 'var(--bg2)',
              border:`1px solid ${sel ? 'var(--g-b)' : 'var(--bd)'}`,
              borderRadius:'var(--R)', padding:'13px 14px',
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <TeamLogo name={m.dom} size={22} />
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>{translateTeam(m.dom)} — {translateTeam(m.ext)}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',marginTop:1}}>{m.jour} {m.heure}</div>
                  </div>
                  <TeamLogo name={m.ext} size={22} />
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center'}}>
                <input
                  type="number" min="0" max="20" placeholder="0"
                  value={domScore && domScore !== '-' ? domScore : ''}
                  onChange={e => {
                    const v = e.target.value
                    const ext = extScore && extScore !== '-' ? extScore : ''
                    setL1(i, v !== '' && ext !== '' ? `${v}-${ext}` : null)
                  }}
                  style={{
                    width:52, height:44, textAlign:'center', fontSize:22, fontWeight:900,
                    background:'var(--bg3)', border:'1px solid var(--bd)', borderRadius:'var(--Rs)',
                    color:'var(--tx)', fontFamily:'var(--D)',
                  }}
                />
                <span style={{fontSize:22,fontWeight:900,color:'var(--tx3)'}}>-</span>
                <input
                  type="number" min="0" max="20" placeholder="0"
                  value={extScore && extScore !== '-' ? extScore : ''}
                  onChange={e => {
                    const v = e.target.value
                    const dom = domScore && domScore !== '-' ? domScore : ''
                    setL1(i, v !== '' && dom !== '' ? `${dom}-${v}` : null)
                  }}
                  style={{
                    width:52, height:44, textAlign:'center', fontSize:22, fontWeight:900,
                    background:'var(--bg3)', border:'1px solid var(--bd)', borderRadius:'var(--Rs)',
                    color:'var(--tx)', fontFamily:'var(--D)',
                  }}
                />
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',marginTop:8}}>Score exact = 3pts · Bonne issue = 1pt</div>
            </div>
          )
        }

        return (
          <div key={i} style={{
            margin:'0 16px 8px',
            background: isJP ? 'rgba(251,191,36,.04)' : isDC ? 'rgba(192,132,252,.04)' : 'var(--bg2)',
            border:`1px solid ${isJP?'var(--a-b)':isDC?'var(--p-b)':sel?'var(--g-b)':'var(--bd)'}`,
            borderRadius:'var(--R)',padding:'13px 14px',transition:'border-color .2s',
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <TeamLogo name={m.dom} size={22} />
                <div>
                  <div style={{fontSize:14,fontWeight:600}}>{translateTeam(m.dom)} — {translateTeam(m.ext)}</div>
                  <div style={{fontSize:11,color:'var(--tx3)',marginTop:1}}>{m.jour} {m.heure}</div>
                </div>
                <TeamLogo name={m.ext} size={22} />
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {isJP && <span className="pill pill-a">🎰 Jackpot</span>}
                {isDC && <span className="pill pill-p">2️⃣ DC</span>}
                {isSelectingBonus && !(activeBonus.type==='jackpot' && isJP) && !(activeBonus.type==='dc' && isDC) && (
                  <button onClick={()=>{
                    if (activeBonus.type==='jackpot') {
                      setJackpotMatch(key)
                      setActiveBonus(null)
                    }
                    if (activeBonus.type==='dc') {
                      setDcMatch(key)
                      setActiveBonus(null)
                    }
                  }} style={{
                    padding:'4px 10px',borderRadius:999,border:'1.5px dashed',
                    borderColor:activeBonus.type==='jackpot'?'var(--a)':'var(--p)',
                    background:'none',cursor:'pointer',fontSize:11,fontWeight:700,
                    color:activeBonus.type==='jackpot'?'var(--a)':'var(--p)',
                  }}>
                    {activeBonus.type==='jackpot'?'🎰 Ici':'2️⃣ Ici'}
                  </button>
                )}
              </div>
            </div>

            {isDC ? (
              // Double Chance — 3 boutons toggle
              <div style={{display:'flex',gap:7}}>
                {['1','N','2'].map(v => <DcBtn key={v} val={v} selected={dcChoices} onClick={()=>toggleDc(v)} />)}
              </div>
            ) : (
              // Normal 1N2
              <div style={{display:'flex',gap:7}}>
                {['1','N','2'].map(v => (
                  <PronoBtn key={v} val={v} selected={sel} onClick={()=>setL1(i,v)} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* ── EURO ── */}
      <div className="section-lbl" style={{padding:'8px 20px'}}>🌍 Match européen — 1N2</div>
      {journee.matchEuro?.dom && (
        <div style={{
          margin:'0 16px 10px',
          background: jackpotMatch==='euro'?'rgba(251,191,36,.04)':dcMatch==='euro'?'rgba(192,132,252,.04)':'rgba(249,115,22,.03)',
          border:`1px solid ${jackpotMatch==='euro'?'var(--a-b)':dcMatch==='euro'?'var(--p-b)':pronos.matchEuro?'var(--g-b)':'var(--o-b)'}`,
          borderRadius:'var(--R)',padding:'13px 14px',
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:600}}>
                {journee.matchEuro.dom} — {journee.matchEuro.ext}
                <span style={{marginLeft:8,fontSize:10,background:'var(--o-dim)',color:'var(--o)',padding:'1px 6px',borderRadius:4,fontWeight:700}}>{journee.matchEuro.ligue}</span>
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',marginTop:1}}>{journee.matchEuro.jour} {journee.matchEuro.heure}</div>
            </div>
            {(activeBonus?.type==='jackpot'||activeBonus?.type==='dc') && jackpotMatch!=='euro' && dcMatch!=='euro' && (
              <button onClick={()=>{
                if (activeBonus.type==='jackpot') {
                  setJackpotMatch('euro')
                  setActiveBonus(null)
                }
                if (activeBonus.type==='dc') {
                  setDcMatch('euro')
                  setActiveBonus(null)
                }
              }} style={{
                padding:'4px 10px',borderRadius:999,border:'1.5px dashed',
                borderColor:activeBonus.type==='jackpot'?'var(--a)':'var(--p)',
                background:'none',cursor:'pointer',fontSize:11,fontWeight:700,
                color:activeBonus.type==='jackpot'?'var(--a)':'var(--p)',
              }}>
                {activeBonus.type==='jackpot'?'🎰 Ici':'2️⃣ Ici'}
              </button>
            )}
          </div>
          {dcMatch==='euro' ? (
            <div style={{display:'flex',gap:7}}>
              {['1','N','2'].map(v => <DcBtn key={v} val={v} selected={dcChoices} onClick={()=>toggleDc(v)} />)}
            </div>
          ) : (
            <div style={{display:'flex',gap:7}}>
              {['1','N','2'].map(v => (
                <PronoBtn key={v} val={v} selected={pronos.matchEuro} onClick={()=>setPronos(p=>({...p,matchEuro:v}))} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div style={{padding:'4px 16px 24px'}}>
        {/* Modal confirmation */}
        {showConfirm && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
            <div style={{background:'#000',border:'1px solid var(--g-b)',borderRadius:'var(--R)',padding:24,width:'100%',maxWidth:400}}>
              <div style={{fontFamily:'var(--D)',fontSize:26,letterSpacing:'.04em',color:'var(--g)',marginBottom:8}}>
                Confirmer l'envoi ?
              </div>
              <div style={{fontSize:13,color:'var(--tx2)',marginBottom:16,lineHeight:1.6}}>
                {filled}/{total} matchs renseignés
                {jackpotMatch && <div style={{color:'var(--a)',fontWeight:700,marginTop:4}}>🎰 Jackpot activé</div>}
                {dcMatch && dcChoices.length===2 && <div style={{color:'var(--p)',fontWeight:700}}>2️⃣ Double Chance activé</div>}
                {missileUsed && <div style={{color:'var(--r)',fontWeight:700}}>🚀 Missile lancé</div>}
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" style={{flex:1,height:46}} onClick={()=>{setShowConfirm(false);handleSubmit()}}>
                  ✅ Confirmer
                </button>
                <button className="btn btn-secondary" onClick={()=>setShowConfirm(false)}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        <button className="btn btn-primary" onClick={()=>setShowConfirm(true)} disabled={saving||filled<total}>
          {saving
            ? <><div className="spinner" style={{width:18,height:18,borderTopColor:'#000'}}></div> Envoi...</>
            : existingProno ? '🔄 Mettre à jour' : `📤 Envoyer mes pronos (${filled}/${total})`
          }
        </button>
        {filled < 10 && <div style={{textAlign:'center',fontSize:12,color:'var(--tx3)',marginTop:8}}>Renseigne les {10-filled} matchs restants</div>}
      </div>
    </div>
  )
}

function Stepper({ val, onChange }) {
  return (
    <div style={{display:'flex',alignItems:'center',background:'var(--bg3)',border:'1px solid var(--bd2)',borderRadius:12,overflow:'hidden'}}>
      <button style={{width:44,height:44,border:'none',background:'none',color:'var(--tx2)',fontSize:22,cursor:'pointer'}} onClick={()=>onChange(Math.max(0,val-1))}>−</button>
      <div style={{width:40,textAlign:'center',fontFamily:'var(--D)',fontSize:28,color:'var(--tx)',letterSpacing:'.04em'}}>{val}</div>
      <button style={{width:44,height:44,border:'none',background:'none',color:'var(--tx2)',fontSize:22,cursor:'pointer'}} onClick={()=>onChange(Math.min(9,val+1))}>+</button>
    </div>
  )
}

function deadlineFmt(j) {
  if (!j?.deadline) return ''
  const dl = new Date(j.deadline.seconds*1000)
  return `Fermeture ${dl.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} ${dl.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`
}

