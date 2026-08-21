import { translateTeam } from '../utils/teamName'
import { useState, useEffect } from 'react'
import { collection, getDocs, getDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { issueMatch, calcPoints1N2, calcPointsScorer, isJackpotOn, getDcChoicesFor, joueurADevineIssue as joueurADevineIssuePure } from '../scoring'
import { useUser } from '../App'
import TeamLogo from '../components/TeamLogo'
import JerseyAvatar from '../components/JerseyAvatar'
import ErrorBoundary from '../components/ErrorBoundary'

function PronosChatteuxContent() {
  const { profil } = useUser()
  const [journeesList, setJourneesList] = useState([])
  const [selectedJId, setSelectedJId] = useState(null)
  const [journee, setJournee] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [pronos, setPronos] = useState({})
  const [missiles, setMissiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingJournee, setLoadingJournee] = useState(true)
  const [erreur, setErreur] = useState('')

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
        // Priorité 1 : une journée "fermee" (deadline pronos passée, mais
        // pas encore résolue en "resultats") — couvre à la fois l'attente
        // du coup d'envoi, les matchs en cours, et l'attente des scores
        // finaux, sans dépendre du statut live match par match.
        // Priorité 2 : la journée "ouverte" la plus proche. Sinon, la
        // dernière de la liste.
        const fermees = liste.filter(j => j.statut === 'fermee')
        const ouvertes = liste.filter(j => j.statut === 'ouverte')
        const defaultJ = fermees.length > 0
          ? fermees.reduce((a, b) => (a.numero < b.numero ? a : b))
          : ouvertes.length > 0
          ? ouvertes.reduce((a, b) => (a.numero < b.numero ? a : b))
          : liste[liste.length - 1]
        if (defaultJ) setSelectedJId(defaultJ.id)
        else setLoadingJournee(false)
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
    let annule = false

    const load = async () => {
      try {
        setLoadingJournee(true)
        setJournee(null)
        setErreur('')
        // Le statut de la journee conditionne la lecture : tant qu'elle est
        // ouverte, les pronos des autres restent secrets (regle du jeu, et
        // les regles Firestore refusent la requete). On ne tente donc la
        // lecture qu'une fois la journee fermee.
        const jDoc = await getDoc(doc(db,'journees',selectedJId))
        if (annule) return
        const donnees = jDoc.exists() ? jDoc.data() : null
        const statut = donnees ? donnees.statut : null
        // Meme condition que les regles Firestore : les pronos deviennent
        // publics des que la deadline est passee, sans attendre le cron de
        // fermeture qui ne s'execute pas a la seconde pres.
        const deadlineFranchie = donnees?.deadline?.seconds
          ? new Date(donnees.deadline.seconds * 1000) < new Date()
          : false

        if (statut === 'ouverte' && !deadlineFranchie) {
          setPronos({})
          setMissiles([])
        } else {
          // Ces deux lectures sont indépendantes : les lancer ensemble réduit
          // sensiblement l'attente sur mobile.
          const [pronosSnap, missilesSnap] = await Promise.all([
            getDocs(collection(db,'journees',selectedJId,'pronos')),
            getDocs(collection(db,'journees',selectedJId,'missiles')),
          ])
          if (annule) return
          const pronosData = {}
          pronosSnap.docs.forEach(d => { pronosData[d.id] = d.data() })
          setPronos(pronosData)
          setMissiles(missilesSnap.docs.map(d => ({ id:d.id, ...d.data() })))
        }

        unsub = onSnapshot(
          doc(db,'journees',selectedJId),
          d => {
            if (!d.exists()) {
              setLoadingJournee(false)
              return
            }
            setJournee({ id:d.id, ...d.data() })
            setLoadingJournee(false)
          },
          e => {
            console.error('Erreur listener journee (PronosChatteux):', e)
            setLoadingJournee(false)
          }
        )
      } catch (e) {
        console.error('Erreur chargement pronos des chatteux:', e)
        setErreur('Impossible de charger les pronos. Verifie ta connexion et reessaie.')
        setLoadingJournee(false)
      }
    }

    load()
    return () => { annule = true; if (unsub) unsub() }
  }, [selectedJId])

  if (loading || loadingJournee) return (
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
  const selecteurJournee = journeesList.length > 1 && (
    <select value={selectedJId} onChange={e => setSelectedJId(e.target.value)}
      style={{ padding:'6px 10px', borderRadius:'var(--Rs)', border:'1px solid var(--bd)', background:'var(--bg3)', color:'var(--tx)', fontSize:16, fontWeight:900, cursor:'pointer' }}>
      {journeesList.map(j => (
        <option key={j.id} value={j.id}>J{j.numero}</option>
      ))}
    </select>
  )

  if (journee.statut === 'ouverte' && !deadlinePassed) return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%' }}>
      {journeesList.length > 1 && (
        <div style={{ padding:'16px 16px 0', display:'flex', justifyContent:'flex-end' }}>
          {selecteurJournee}
        </div>
      )}
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
        {journeesList.length > 1 && (
          <div style={{ marginTop:20, fontSize:12, color:'var(--tx3)' }}>
            Tu peux consulter une autre journée avec le sélecteur en haut à droite ↑
          </div>
        )}
      </div>
    </div>
  )

  // Miroir du helper serveur (index.js) — un joueur en DC est compté comme
  // ayant deviné juste si l'issue fait partie de ses 2 choix, pas seulement
  // si sa valeur brute stockée correspond (fix bug bonCount/ratio surprise, J12).
  // Le seul ajout par rapport à la version serveur : la vérification missile,
  // qui vit en dehors du doc prono côté app (server applique déjà le missile
  // sur une copie avant d'appeler l'équivalent de joueurADevineIssuePure).
  const joueurADevineIssue = (u, key, issue) => {
    const p = pronos[u]
    if (!p) return false
    const missile = missiles.find(m => m.cible === u && m.matchKey === key && m.applique)
    if (missile) return missile.pronoImpose === issue
    return joueurADevineIssuePure(p, key, issue)
  }
  const scorer = journee.matchScorer
  const matchesMain = (journee.matchesL1 || []).filter(m => m?.dom)
  const euro = journee.matchEuro?.dom ? journee.matchEuro : null

  // Construire la liste des matchs à afficher
  const matchBlocks = [
    scorer?.dom ? { key:'scorer', dom: scorer.dom, ext: scorer.ext, jour: scorer.jour, heure: scorer.heure, isScorer: true, label: '⚽ Match Scorer' } : null,
    ...matchesMain.map((m, i) => ({ key: `l1_${i}`, dom: m.dom, ext: m.ext, jour: m.jour, heure: m.heure, label: `Match ${i+1}`, isMatchScorer: m.scorer === true })),
    euro ? { key:'euro', dom: euro.dom, ext: euro.ext, jour: euro.jour, heure: euro.heure, isEuro: true, label: '🌍 Affiche Européenne' } : null,
  ].filter(Boolean)

  const getProno = (uid, key) => {
    const p = pronos[uid]
    if (!p) return null
    const missile = missiles.find(m => m.cible === uid && m.matchKey === key && m.applique)
    if (missile) return { val: missile.pronoImpose, isMissile: true }
    // DC active sur ce match : toujours afficher les 2 choix, même si un prono
    // de base existe aussi en dessous (même logique que l'admin — voir Pronos.jsx)
    const dcChoicesIci = getDcChoicesFor(p, key)
    if (dcChoicesIci?.length === 2) return { val: dcChoicesIci.join('/'), isDC: true }
    if (key === 'scorer') return p.matchScorer ? { val: p.matchScorer } : null
    if (key === 'euro') return p.matchEuro ? { val: p.matchEuro } : null
    const idx = parseInt(key.replace('l1_', ''))
    const arr = p.matchesL1
    if (arr?.[idx]) return { val: arr[idx] }
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
    const p = pronos[uid]
    const missileIci = missiles.find(m => m.cible === uid && m.matchKey === key && m.applique)
    const dcChoicesIci = missileIci ? null : getDcChoicesFor(p, key)
    if (dcChoicesIci?.length > 0) {
      return dcChoicesIci.includes(issue) ? 'correct' : 'wrong'
    }
    return prono.val === issue ? 'correct' : 'wrong'
  }

  const getPtsMatch = (uid, key, isScorer) => {
    if (journee.statut !== 'resultats' && journee.statut !== 'fermee') return null
    const prono = getProno(uid, key)
    const res = journee.resultats?.[key]
    if (!prono || !res || (res.status !== 'FINISHED' && res.status !== 'IN_PLAY' && res.status !== 'PAUSED')) return null
    const rh = parseInt(res.h), ra = parseInt(res.a)
    const p = pronos[uid]
    const allTotal = Object.keys(pronos).length
    if (isScorer || journee.scorerOnly || matchBlocks.find(b => b.key === key)?.isMatchScorer) {
      // Aligné sur calcPointsScorer côté serveur (index.js) : applique aussi
      // le bonus surprise (2pts au lieu de 1) sur le palier "bonne issue"
      // si ≤25% des joueurs ont trouvé — l'ancienne version locale ne le
      // faisait pas et sous-affichait certains points en live.
      const bonCountScorer = Object.keys(pronos).filter(u => {
        const pu = pronos[u]
        const pr = key === 'scorer' ? pu?.matchScorer : pu?.matchesL1?.[parseInt(key.replace('l1_', ''))]
        if (!pr || !/^\d+-\d+$/.test(pr)) return false
        const [ph, pa] = pr.split('-').map(Number)
        return issueMatch(ph, pa) === issueMatch(rh, ra)
      }).length
      return calcPointsScorer(prono.val, rh, ra, bonCountScorer, allTotal)
    }
    const issue = issueMatch(rh, ra)
    const missileIci = missiles.find(m => m.cible === uid && m.matchKey === key && m.applique)
    const dcChoicesIci = missileIci ? null : getDcChoicesFor(p, key)
    if (dcChoicesIci?.length > 0) {
      if (!dcChoicesIci.includes(issue)) return 0
      return isJackpotOn(p, key) ? 2 : 1
    }
    if (prono.val !== issue) return 0
    const bonCount = Object.keys(pronos).filter(u => joueurADevineIssue(u, key, issue)).length
    return calcPoints1N2(p, prono.val, issue, bonCount, allTotal, key)
  }

  // Même indicateur que dans l'admin : un choix 1/N/2 joué par 25 % des
  // participants ou moins est signalé comme surprise. Les matchs à scorer,
  // Double Chance et pronos imposés par missile ne sont pas concernés.
  const isSurprise = (uid, key, isScorer) => {
    if (isScorer || journee.scorerOnly || matchBlocks.find(b => b.key === key)?.isMatchScorer) return false
    const prono = getProno(uid, key)
    if (!prono?.val || prono.isDC || prono.isMissile) return false

    const total = Object.keys(pronos).length
    if (total === 0) return false

    const votes = Object.keys(pronos).filter(otherUid => {
      const autreProno = getProno(otherUid, key)
      return autreProno?.val === prono.val && !autreProno.isDC
    }).length

    return votes / total <= 0.25
  }

  // Avant le coup d'envoi, différencie visuellement les choix 1/N/2. Dès
  // qu'un résultat live existe, les couleurs exact/écart/issue/erreur prennent
  // le relais plus bas.
  const getPendingPronoPalette = (prono, isScorer) => {
    if (prono?.isMissile) {
      return { color:'#FF4444', background:'rgba(255,68,68,.12)', border:'rgba(255,68,68,.35)' }
    }
    let issue = prono?.val
    if (isScorer) {
      const score = String(prono?.val || '').match(/^(\d+)-(\d+)$/)
      issue = score ? issueMatch(Number(score[1]), Number(score[2])) : null
    }
    if (issue === '1') {
      return { color:'var(--b)', background:'rgba(96,165,250,.12)', border:'rgba(96,165,250,.35)' }
    }
    if (issue === 'N') {
      return { color:'var(--a)', background:'var(--a-dim)', border:'var(--a-b)' }
    }
    if (issue === '2') {
      return { color:'var(--p)', background:'rgba(192,132,252,.12)', border:'rgba(192,132,252,.35)' }
    }
    return { color:'var(--tx)', background:'rgba(255,255,255,.04)', border:'rgba(255,255,255,.06)' }
  }

  const getBonusLabels = (uid, key) => {
    const p = pronos[uid]
    if (!p) return []
    const labels = []
    if (isJackpotOn(p, key)) labels.push({ icon: '🎰', label: 'Jackpot' })
    if (getDcChoicesFor(p, key)?.length > 0) labels.push({ icon: '2️⃣', label: 'DC' })
    return labels
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
          {selecteurJournee}
          <span className={`pill ${journee.statut==='resultats'?'pill-g':'pill-a'}`}>
            {journee.statut==='resultats'?'🏁 Résultats':'🔒 Fermée'}
          </span>
        </div>
      </div>

      {erreur && (
        <div style={{ margin:'0 12px 12px', padding:'12px 14px', background:'rgba(252,165,165,.08)', border:'1px solid rgba(252,165,165,.25)', borderRadius:'var(--Rs)', fontSize:13, color:'#FCA5A5' }}>
          {erreur}
        </div>
      )}

      {/* Blocs par match */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'0 12px' }}>
        {matchBlocks.map(match => {
          const res = journee.resultats?.[match.key]
          const hasScore = res && (res.status === 'FINISHED' || res.status === 'IN_PLAY' || res.status === 'PAUSED') && res.h !== null && res.a !== null
          const isLive = res?.status === 'IN_PLAY'
          const isPaused = res?.status === 'PAUSED'
          const isFinished = res?.status === 'FINISHED'
          const isPostponed = res?.status === 'POSTPONED'

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
                <div style={{ display:'flex', flexDirection:'column', gap:2, flex:'1 1 auto', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
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
                    {(match.isScorer || match.isMatchScorer) && (
                      <div style={{
                        display:'flex', alignItems:'center', gap:3, flexShrink:0,
                        padding:'2px 6px', borderRadius:20,
                        background:'rgba(96,165,250,.15)', border:'1px solid rgba(96,165,250,.4)',
                        fontSize:9, fontWeight:900, color:'var(--b)', letterSpacing:'.06em',
                      }}>
                        ⚽ SCORER
                      </div>
                    )}
                    {(isLive || isPaused || isPostponed) && (
                      <div style={{
                        display:'flex', alignItems:'center', gap:3, flexShrink:0,
                        padding:'2px 6px', borderRadius:20,
                        background: isPaused ? 'var(--a-dim)' : 'rgba(248,68,68,.15)',
                        border: `1px solid ${isPaused ? 'var(--a-b)' : 'rgba(248,68,68,.4)'}`,
                        fontSize:9, fontWeight:900, color:isPaused ? 'var(--a)' : '#FF4444', letterSpacing:'.06em',
                        animation:isLive ? 'pulse 1.5s infinite' : undefined,
                      }}>
                        {isLive && <span style={{ width:4, height:4, borderRadius:'50%', background:'#FF4444', display:'inline-block' }} />}
                        {isLive ? 'LIVE' : isPaused ? '⏸ MI-TEMPS' : '⚠️ REPORTÉ'}
                      </div>
                    )}
                  </div>
                  {!hasScore && (match.jour || match.heure) && (
                    <div style={{ fontSize:10, color:'var(--tx3)', fontWeight:700 }}>
                      {match.jour}{match.jour && match.heure ? ' · ' : ''}{match.heure}
                    </div>
                  )}
                </div>

                {/* Score */}
                {hasScore ? (
                  <div style={{
                    fontFamily:'var(--D)', fontSize:18, fontWeight:900, letterSpacing:'.04em',
                    color:'var(--tx)',
                    padding:'4px 9px', borderRadius:'var(--Rs)', flexShrink:0,
                    background: isLive ? 'rgba(248,68,68,.10)' : isPaused ? 'var(--a-dim)' : isFinished ? 'rgba(155,226,45,.08)' : 'rgba(255,255,255,.05)',
                    border: `1px solid ${isLive ? 'rgba(248,68,68,.4)' : isPaused ? 'var(--a-b)' : isFinished ? 'var(--g-b)' : 'var(--bd)'}`,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
                      {isLive && <span style={{ width:6, height:6, borderRadius:'50%', background:'#FF4444', display:'inline-block', flexShrink:0 }} />}
                      {res.h} - {res.a}
                    </div>
                    {(isLive || isPaused) && (
                      <div style={{ fontSize:11, color:isPaused ? 'var(--a)' : '#FF4444', fontWeight:700, lineHeight:1 }}>
                        {isPaused ? 'Mi-temps' : res.elapsed !== undefined && res.elapsed !== null ? `${res.elapsed}'` : 'En cours'}
                      </div>
                    )}
                    {isFinished && (
                      <div style={{ fontSize:10, fontWeight:900, letterSpacing:'.06em', color:'var(--g)', lineHeight:1 }}>✓ Terminé</div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:900, letterSpacing:'.06em',
                    background:isPostponed ? 'rgba(248,68,68,.12)' : 'rgba(96,165,250,.12)',
                    border:`1px solid ${isPostponed ? 'rgba(248,68,68,.4)' : 'rgba(96,165,250,.35)'}`,
                    color:isPostponed ? '#FF4444' : 'var(--b)',
                  }}>
                    {isPostponed ? '⚠️ Reporté' : '🕐 À venir'}
                  </div>
                )}
              </div>

              {/* Sagesse du groupe — répartition des pronos une fois la deadline passée */}
              {(journee.statut === 'fermee' || journee.statut === 'resultats') && (() => {
                const counts = { '1': 0, 'N': 0, '2': 0 }
                let total = 0
                const estMatchScorer = match.isScorer || match.isMatchScorer || journee.scorerOnly
                joueurs.forEach(j => {
                  const p = pronos[j.id]
                  if (!p) return

                  const pronoJoueur = getProno(j.id, match.key)
                  if (!pronoJoueur?.val) return

                  // Pour un match à scorer, on transforme chaque score en
                  // issue 1/N/2 afin d'afficher le même bandeau statistique.
                  if (estMatchScorer) {
                    const score = String(pronoJoueur.val).match(/^(\d+)-(\d+)$/)
                    if (!score) return
                    const issue = issueMatch(Number(score[1]), Number(score[2]))
                    counts[issue] += 1
                    total++
                    return
                  }

                  // DC active : le joueur mise sur 2 issues — on répartit son vote (0.5 + 0.5)
                  // pour que le total reste cohérent avec le nombre de joueurs.
                  const dcChoicesIci = getDcChoicesFor(p, match.key)
                  if (dcChoicesIci?.length === 2) {
                    dcChoicesIci.forEach(v => { if (counts[v] !== undefined) counts[v] += 0.5 })
                    total++
                    return
                  }
                  const v = pronoJoueur.val
                  if (v === '1' || v === 'N' || v === '2') { counts[v] += 1; total++ }
                })
                if (total === 0) return null
                const pct = v => Math.round((counts[v] / total) * 100)
                const COLORS = { '1': 'var(--b)', 'N': 'var(--a)', '2': 'var(--p)' }
                return (
                  <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--bd)' }}>
                    {estMatchScorer && (
                      <div style={{ marginBottom:5, fontSize:9, color:'var(--tx3)', fontWeight:900, textTransform:'uppercase', letterSpacing:'.06em' }}>
                        Issue des scores pronostiqués
                      </div>
                    )}
                    <div style={{ display:'flex', height:8, borderRadius:5, overflow:'hidden', background:'rgba(255,255,255,.05)' }}>
                      {['1','N','2'].map(v => counts[v] > 0 && (
                        <div key={v} style={{ width:`${pct(v)}%`, background:COLORS[v] }} title={`${v}: ${pct(v)}%`} />
                      ))}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, fontWeight:700 }}>
                      {['1','N','2'].map(v => (
                        <span key={v} style={{ color: counts[v] > 0 ? COLORS[v] : 'var(--tx3)' }}>{v} · {pct(v)}%</span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Lignes joueurs */}
              <div>
                {joueursTriés.map((j, idx) => {
                  const isMe = j.id === profil?.id
                  const prono = getProno(j.id, match.key)
                  const correct = getCorrect(j.id, match.key, match.isScorer)
                  const pts = getPtsMatch(j.id, match.key, match.isScorer)
                  const surprise = isSurprise(j.id, match.key, match.isScorer)
                  const pendingPalette = getPendingPronoPalette(
                    prono,
                    match.isScorer || match.isMatchScorer || journee.scorerOnly
                  )
                  const bonuses = getBonusLabels(j.id, match.key)
                  const missilesRecus = missiles.filter(m => m.cible === j.id && m.matchKey === match.key)
                  const missilesLances = missiles.filter(m => m.lanceur === j.id && m.matchKey === match.key)
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
                        <JerseyAvatar club={j.clubCoeur} initials={j.initiales} size={26} />
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
                          {bonuses.map((bonus, bi) => (
                            <div key={bi} style={{
                              display:'flex', alignItems:'center', gap:3,
                              padding:'2px 6px', borderRadius:20,
                              background: bonus.icon === '🎰' ? 'rgba(255,200,0,.12)' : 'rgba(96,165,250,.12)',
                              border: `1px solid ${bonus.icon === '🎰' ? 'rgba(255,200,0,.3)' : 'rgba(96,165,250,.3)'}`,
                              fontSize:10, fontWeight:700,
                              color: bonus.icon === '🎰' ? '#FFD700' : 'var(--b)',
                            }}>
                              {bonus.icon} {bonus.label}
                            </div>
                          ))}
                          {missilesRecus.map(m => (
                            <div key={m.id} style={{
                              display:'flex', alignItems:'center', gap:3,
                              padding:'2px 6px', borderRadius:20,
                              background:'rgba(248,68,68,.12)',
                              border:'1px solid rgba(248,68,68,.3)',
                              fontSize:10, fontWeight:700, color:'#FF4444',
                            }}>
                              🚀 {joueurs.find(u => u.id === m.lanceur)?.nom?.split(' ')[0] || '?'}
                            </div>
                          ))}
                          {missilesLances.map(m => (
                            <div key={m.id} style={{
                              display:'flex', alignItems:'center', gap:3,
                              padding:'2px 6px', borderRadius:20,
                              background:'rgba(251,146,60,.12)',
                              border:'1px solid rgba(251,146,60,.3)',
                              fontSize:10, fontWeight:700, color:'var(--o)',
                            }}>
                              ↗ {joueurs.find(u => u.id === m.cible)?.nom?.split(' ')[0] || '?'}
                            </div>
                          ))}
                        </div>
                        {/* Prono + points en dessous */}
                        {prono ? (
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                              {surprise && (
                                <span
                                  title='Prono surprise — choisi par 25 % des joueurs ou moins'
                                  aria-label='Prono surprise'
                                  style={{ fontSize:10, color:'var(--p)', lineHeight:1 }}
                                >
                                  ⚡
                                </span>
                              )}
                              <div style={{
                                fontFamily:'var(--D)', fontSize:18, fontWeight:900, letterSpacing:'.04em',
                                minWidth:42, textAlign:'center',
                                padding:'4px 8px', borderRadius:'var(--Rs)',
                                color: correct === 'exact' ? '#FFD700' : correct === 'ecart' ? '#9BE22D' : correct === 'correct' ? '#9BE22D' : correct === 'issue' ? '#FB923C' : correct === 'wrong' ? '#FF4444' : pendingPalette.color,
                                background: correct === 'exact' ? 'rgba(255,200,0,.18)' : correct === 'ecart' || correct === 'correct' ? 'rgba(155,226,45,.18)' : correct === 'issue' ? 'rgba(251,146,60,.18)' : correct === 'wrong' ? 'rgba(255,68,68,.18)' : pendingPalette.background,
                                border: `1px solid ${correct === 'exact' ? 'rgba(255,200,0,.6)' : correct === 'ecart' || correct === 'correct' ? 'rgba(155,226,45,.5)' : correct === 'issue' ? 'rgba(251,146,60,.5)' : correct === 'wrong' ? 'rgba(255,68,68,.5)' : pendingPalette.border}`,
                              }}>
                                {prono.val}
                              </div>
                            </div>
                            {pts !== null && (
                              <div style={{
                                fontSize:15, fontWeight:900, lineHeight:1,
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

export default function PronosChatteux() {
  return <ErrorBoundary><PronosChatteuxContent /></ErrorBoundary>
}











