import { translateTeam } from '../utils/teamName'
import { useState, useEffect } from 'react'
import { collection, getDocs, getDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { issueMatch, calcPoints1N2, calcPointsScorer, isJackpotOn, getDcChoicesFor, joueurADevineIssue as joueurADevineIssuePure } from '../scoring'
import { useUser } from '../App'
import TeamLogo from '../components/TeamLogo'
import JerseyAvatar from '../components/JerseyAvatar'
import ErrorBoundary from '../components/ErrorBoundary'
import { GAINS_JOURNEE } from '../firebase/constants'

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
  const [detailPoints, setDetailPoints] = useState(null)
  const [cartesDepliees, setCartesDepliees] = useState({})
  const [derniereActualisation, setDerniereActualisation] = useState(null)

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
            setDerniereActualisation(new Date())
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

  const horaireMatch = (match) => {
    if (typeof match.utcDate?.toMillis === 'function') return match.utcDate.toMillis()
    if (match.utcDate?.seconds) return match.utcDate.seconds * 1000
    const timestamp = Date.parse(match.utcDate || '')
    return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
  }

  // Construire la liste sans modifier les clés d'origine des pronos, puis :
  // 1) matchs non terminés en premier, par ordre chronologique ;
  // 2) matchs terminés en bas, également par ordre chronologique.
  const matchBlocks = [
    scorer?.dom ? { key:'scorer', dom: scorer.dom, ext: scorer.ext, jour: scorer.jour, heure: scorer.heure, utcDate: scorer.utcDate, isScorer: true, label: '⚽ Match Scorer', ordreInitial: -1 } : null,
    ...matchesMain.map((m, i) => ({ key: `l1_${i}`, dom: m.dom, ext: m.ext, jour: m.jour, heure: m.heure, utcDate: m.utcDate, label: `Match ${i+1}`, isMatchScorer: m.scorer === true, ordreInitial: i })),
    euro ? { key:'euro', dom: euro.dom, ext: euro.ext, jour: euro.jour, heure: euro.heure, utcDate: euro.utcDate, isEuro: true, label: '🌍 Affiche Européenne', ordreInitial: matchesMain.length + 1 } : null,
  ].filter(Boolean).sort((a, b) => {
    const aTermine = journee.resultats?.[a.key]?.status === 'FINISHED'
    const bTermine = journee.resultats?.[b.key]?.status === 'FINISHED'
    if (aTermine !== bTermine) return aTermine ? 1 : -1
    return horaireMatch(a) - horaireMatch(b) || a.ordreInitial - b.ordreInitial
  })

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
    if (journee.statut !== 'resultats' && journee.statut !== 'fermee' && !deadlinePassed) return null
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

  // Un choix joué par 25 % des participants ou moins est signalé comme
  // surprise. Pour un match à scorer, on compare l'issue du score pronostiqué
  // (1/N/2), comme pour le bonus surprise utilisé dans son calcul de points.
  const isSurprise = (uid, key, isScorer) => {
    const prono = getProno(uid, key)
    if (!prono?.val || prono.isDC || prono.isMissile) return false

    const total = Object.keys(pronos).length
    if (total === 0) return false

    const estMatchScorer = isScorer || journee.scorerOnly || matchBlocks.find(b => b.key === key)?.isMatchScorer
    if (estMatchScorer) {
      const score = String(prono.val).match(/^(\d+)-(\d+)$/)
      if (!score) return false
      const issuePronostiquee = issueMatch(Number(score[1]), Number(score[2]))
      const votes = Object.keys(pronos).filter(otherUid => {
        const autreProno = getProno(otherUid, key)
        const autreScore = String(autreProno?.val || '').match(/^(\d+)-(\d+)$/)
        return autreScore && issueMatch(Number(autreScore[1]), Number(autreScore[2])) === issuePronostiquee
      }).length
      return votes / total <= 0.25
    }

    const votes = Object.keys(pronos).filter(otherUid => {
      const autreProno = getProno(otherUid, key)
      return autreProno?.val === prono.val && !autreProno.isDC
    }).length

    return votes / total <= 0.25
  }

  const expliquerPoints = (uid, key, isScorer, correct, pts, surprise) => {
    if (pts === null) return null
    const p = pronos[uid]
    const prono = getProno(uid, key)
    const estScorer = isScorer || journee.scorerOnly || matchBlocks.find(b => b.key === key)?.isMatchScorer
    const jackpot = !estScorer && isJackpotOn(p, key)
    const dcChoices = !estScorer ? getDcChoicesFor(p, key) : null
    const missile = missiles.find(m => m.cible === uid && m.matchKey === key && m.applique)

    let raison = 'Mauvaise issue'
    if (estScorer) {
      if (correct === 'exact') raison = 'Score exact'
      else if (correct === 'ecart') raison = 'Bon écart'
      else if (correct === 'issue') raison = surprise ? 'Bonne issue surprise' : 'Bonne issue'
    } else if (correct === 'correct') {
      raison = surprise ? 'Bonne issue surprise' : dcChoices?.length ? 'Bonne issue avec Double Chance' : 'Bonne issue'
    }

    if (jackpot && pts > 0) raison += ' · Jackpot ×2'
    if (missile) raison += ' · Prono imposé par missile'

    let repartition = null
    if (surprise && prono?.val) {
      const total = Object.keys(pronos).length
      let votes = 0
      if (estScorer) {
        const score = String(prono.val).match(/^(\d+)-(\d+)$/)
        if (score) {
          const issue = issueMatch(Number(score[1]), Number(score[2]))
          votes = Object.keys(pronos).filter(otherUid => {
            const autre = String(getProno(otherUid, key)?.val || '').match(/^(\d+)-(\d+)$/)
            return autre && issueMatch(Number(autre[1]), Number(autre[2])) === issue
          }).length
        }
      } else {
        votes = Object.keys(pronos).filter(otherUid => getProno(otherUid, key)?.val === prono.val).length
      }
      repartition = `Choisi par ${votes} joueur${votes > 1 ? 's' : ''} sur ${total}`
    }

    return { points:pts, raison, repartition }
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

  // Tableau de bord live calculé uniquement avec les données déjà en
  // mémoire. Le serveur reste la source officielle lors de la finalisation.
  const statutsMatchs = matchBlocks.map(match => journee.resultats?.[match.key]?.status || 'SCHEDULED')
  const nbLive = statutsMatchs.filter(status => status === 'IN_PLAY').length
  const nbPause = statutsMatchs.filter(status => status === 'PAUSED').length
  const nbTermines = statutsMatchs.filter(status => status === 'FINISHED').length
  const calculProvisoireActif = nbLive + nbPause + nbTermines > 0
  const pointsProvisoires = joueurs.map(joueur => ({
    ...joueur,
    pointsProvisoires: matchBlocks.reduce((somme, match) => {
      const points = getPtsMatch(joueur.id, match.key, match.isScorer)
      return somme + (points ?? 0)
    }, Number(journee.penalites?.[joueur.id] || 0)),
  })).sort((a, b) => b.pointsProvisoires - a.pointsProvisoires || (a.nom || '').localeCompare(b.nom || ''))

  const gainsProvisoires = {}
  if (calculProvisoireActif) {
    let index = 0
    while (index < pointsProvisoires.length) {
      let finEgalite = index + 1
      while (finEgalite < pointsProvisoires.length && pointsProvisoires[finEgalite].pointsProvisoires === pointsProvisoires[index].pointsProvisoires) finEgalite++
      let enveloppe = 0
      for (let place = index + 1; place <= finEgalite; place++) enveloppe += GAINS_JOURNEE[place] || 0
      const gain = Math.round((enveloppe / (finEgalite - index)) * 100) / 100
      for (let position = index; position < finEgalite; position++) gainsProvisoires[pointsProvisoires[position].id] = gain
      index = finEgalite
    }
  }

  let rangPrecedent = null
  const classementProvisoire = pointsProvisoires.map((joueur, index) => {
    const rang = index > 0 && joueur.pointsProvisoires === pointsProvisoires[index - 1].pointsProvisoires ? rangPrecedent : index + 1
    rangPrecedent = rang
    return { ...joueur, rang, gainProvisoire:gainsProvisoires[joueur.id] || 0 }
  })
  const maSituation = classementProvisoire.find(joueur => joueur.id === profil?.id)
  const rangLibelle = maSituation?.rang === 1 ? '1er' : maSituation ? `${maSituation.rang}e` : '—'
  const resumeMatchs = [
    nbLive > 0 ? `🔴 ${nbLive} live` : null,
    nbPause > 0 ? `🟠 ${nbPause} pause` : null,
    nbTermines > 0 ? `🟢 ${nbTermines} terminé${nbTermines > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{ padding:'16px 0 32px' }}>
      {detailPoints && (
        <div onClick={() => setDetailPoints(null)} style={{ position:'fixed', inset:0, zIndex:700, background:'rgba(0,0,0,.72)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:16 }}>
          <div role="dialog" aria-modal="true" aria-label="Détail des points" onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:420, padding:'20px 18px', borderRadius:'18px 18px 12px 12px', background:'var(--bg2)', border:'1px solid var(--bd2)', boxShadow:'0 -10px 40px rgba(0,0,0,.45)', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--D)', fontSize:30, fontWeight:900, color:detailPoints.points >= 3 ? '#FFD700' : detailPoints.points > 0 ? 'var(--g)' : 'var(--tx3)' }}>
              +{detailPoints.points} pt{detailPoints.points > 1 ? 's' : ''}
            </div>
            <div style={{ marginTop:6, fontSize:15, fontWeight:900, color:'var(--tx)' }}>{detailPoints.raison}</div>
            {detailPoints.repartition && <div style={{ marginTop:7, fontSize:12, color:'var(--p)', fontWeight:700 }}>⚡ {detailPoints.repartition}</div>}
            <button type="button" className="btn btn-secondary" onClick={() => setDetailPoints(null)} style={{ width:'100%', marginTop:18 }}>Fermer</button>
          </div>
        </div>
      )}

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

      {maSituation && (
        <div style={{ margin:'0 12px 14px', padding:'14px', borderRadius:'var(--R)', background:'linear-gradient(135deg, rgba(96,165,250,.10), rgba(155,226,45,.055))', border:'1px solid rgba(96,165,250,.25)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:900, letterSpacing:'.07em', color:nbLive ? '#FF4444' : nbPause ? 'var(--a)' : nbTermines ? 'var(--g)' : 'var(--b)', textTransform:'uppercase' }}>
              {resumeMatchs || '🕐 Matchs à venir'}
            </div>
            {derniereActualisation && <div style={{ fontSize:9, color:'var(--tx3)', whiteSpace:'nowrap' }}>À {derniereActualisation.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</div>}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
            <div style={{ padding:'9px 6px', borderRadius:'var(--Rs)', background:'rgba(255,255,255,.035)', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--D)', fontSize:22, color:'var(--tx)', fontWeight:900 }}>{calculProvisoireActif ? maSituation.pointsProvisoires : '—'}</div>
              <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:800 }}>POINTS PROV.</div>
            </div>
            <div style={{ padding:'9px 6px', borderRadius:'var(--Rs)', background:'rgba(255,255,255,.035)', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--D)', fontSize:22, color:'var(--b)', fontWeight:900 }}>{calculProvisoireActif ? rangLibelle : '—'}</div>
              <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:800 }}>CLASSEMENT</div>
            </div>
            <div style={{ padding:'9px 6px', borderRadius:'var(--Rs)', background:'rgba(255,255,255,.035)', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--D)', fontSize:22, color:maSituation.gainProvisoire > 0 ? 'var(--g)' : 'var(--tx3)', fontWeight:900 }}>{calculProvisoireActif ? `${maSituation.gainProvisoire.toFixed(2)}€` : '—'}</div>
              <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:800 }}>GAIN PROV.</div>
            </div>
          </div>
        </div>
      )}

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
          const estMatchScorer = match.isScorer || match.isMatchScorer || journee.scorerOnly
          const cleCarte = `${journee.id}:${match.key}`
          const statutCarte = res?.status || 'SCHEDULED'
          const ouvertureAuto = isLive || isPaused
          const choixManuel = cartesDepliees[cleCarte]
          const carteDepliee = choixManuel?.statut === statutCarte ? choixManuel.ouverte : ouvertureAuto

          return (
            <div key={match.key} style={{
              borderRadius:'var(--R)',
              border: `${estMatchScorer ? '2px solid rgba(255,215,0,.78)' : `1px solid ${match.isEuro ? 'rgba(251,146,60,.15)' : 'var(--bd)'}`}`,
              boxShadow:estMatchScorer ? '0 0 25px rgba(255,215,0,.18), inset 0 0 20px rgba(255,215,0,.035)' : undefined,
              overflow:'hidden',
              background:estMatchScorer ? 'linear-gradient(135deg, rgba(96,165,250,.075), var(--bg2) 42%)' : 'var(--bg2)',
            }}>
              {/* Header match */}
              <div style={{
                padding:'10px 14px',
                background: estMatchScorer ? 'linear-gradient(90deg, rgba(255,215,0,.20), rgba(255,215,0,.055) 62%, rgba(255,215,0,.12))' : match.isEuro ? 'rgba(251,146,60,.06)' : 'rgba(255,255,255,.03)',
                borderBottom:`1px solid ${estMatchScorer ? 'rgba(255,215,0,.48)' : 'var(--bd)'}`,
                boxShadow:estMatchScorer ? 'inset 0 -1px 0 rgba(255,215,0,.10)' : undefined,
                display:'flex', flexDirection:'column', alignItems:'center', gap:7,
              }}>
                {estMatchScorer && (
                  <div style={{ padding:'3px 9px', borderRadius:20, background:'rgba(255,215,0,.11)', border:'1px solid rgba(255,215,0,.48)', fontSize:9, fontWeight:900, color:'#FFD700', letterSpacing:'.06em', boxShadow:'0 0 10px rgba(255,215,0,.15)' }}>
                    🎯 MATCH À SCORER
                  </div>
                )}

                {/* Équipes, avec témoin live sur la même ligne */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', minWidth:0 }}>
                  {isLive && <span aria-label="Match en direct" style={{ width:8, height:8, borderRadius:'50%', background:'#FF4444', boxShadow:'0 0 0 4px rgba(248,68,68,.14)', animation:'pulse 1.5s infinite', display:'inline-block', flexShrink:0 }} />}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, minWidth:0 }}>
                    <TeamLogo name={match.dom} size={25} />
                    <span style={{ fontSize:14, fontWeight:900, color:estMatchScorer ? '#FFF4C2' : 'var(--tx)', textTransform:'uppercase', letterSpacing:'.025em', textAlign:'center' }}>
                      {translateTeam(match.dom)}
                    </span>
                    <span style={{ fontSize:10, color:estMatchScorer ? '#FFD700' : 'var(--tx3)', fontWeight:800, flexShrink:0 }}>VS</span>
                    <TeamLogo name={match.ext} size={25} />
                    <span style={{ fontSize:14, fontWeight:900, color:estMatchScorer ? '#FFF4C2' : 'var(--tx)', textTransform:'uppercase', letterSpacing:'.025em', textAlign:'center' }}>
                      {translateTeam(match.ext)}
                    </span>
                  </div>
                </div>

                {(match.jour || match.heure) && (
                  <div style={{ fontSize:11, color:'var(--tx3)', fontWeight:700, textAlign:'center' }}>
                    {match.jour}{match.jour && match.heure ? ' · ' : ''}{match.heure}
                  </div>
                )}

                <div style={{
                  padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:900, letterSpacing:'.06em',
                  background:isLive ? 'rgba(248,68,68,.12)' : isPaused ? 'var(--a-dim)' : isFinished ? 'rgba(155,226,45,.08)' : isPostponed ? 'rgba(248,68,68,.12)' : 'rgba(96,165,250,.12)',
                  border:`1px solid ${isLive ? 'rgba(248,68,68,.4)' : isPaused ? 'var(--a-b)' : isFinished ? 'var(--g-b)' : isPostponed ? 'rgba(248,68,68,.4)' : 'rgba(96,165,250,.35)'}`,
                  color:isLive || isPostponed ? '#FF4444' : isPaused ? 'var(--a)' : isFinished ? 'var(--g)' : 'var(--b)',
                }}>
                  {isLive ? `LIVE${res.elapsed !== undefined && res.elapsed !== null ? ` · ${res.elapsed}'` : ''}` : isPaused ? '⏸ MI-TEMPS' : isFinished ? '✓ TERMINÉ' : isPostponed ? '⚠️ REPORTÉ' : '🕐 À VENIR'}
                </div>

                {/* Score */}
                {hasScore && (
                  <div style={{
                    fontFamily:'var(--D)', fontSize:21, fontWeight:900, letterSpacing:'.04em',
                    color:'var(--tx)',
                    padding:'5px 12px', borderRadius:'var(--Rs)', flexShrink:0,
                    background: isLive ? 'rgba(248,68,68,.10)' : isPaused ? 'var(--a-dim)' : isFinished ? 'rgba(155,226,45,.08)' : 'rgba(255,255,255,.05)',
                    border: `1px solid ${isLive ? 'rgba(248,68,68,.4)' : isPaused ? 'var(--a-b)' : isFinished ? 'var(--g-b)' : 'var(--bd)'}`,
                    whiteSpace:'nowrap',
                  }}>
                    {res.h} - {res.a}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCartesDepliees(prev => ({ ...prev, [cleCarte]: { statut:statutCarte, ouverte:!carteDepliee } }))}
                aria-expanded={carteDepliee}
                style={{
                  width:'100%', minHeight:38, padding:'8px 12px',
                  border:0, borderBottom:carteDepliee ? '1px solid var(--bd)' : 0,
                  background:'rgba(255,255,255,.025)', color:carteDepliee ? 'var(--tx3)' : 'var(--b)',
                  fontSize:11, fontWeight:900, letterSpacing:'.035em', cursor:'pointer',
                }}
              >
                {carteDepliee ? '▲ Masquer les pronostics' : '▼ Voir les pronostics'}
              </button>

              {carteDepliee && <>

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
                  const explicationPoints = expliquerPoints(j.id, match.key, match.isScorer, correct, pts, surprise)
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
                              <button type="button" onClick={() => setDetailPoints(explicationPoints)} aria-label={`Voir le détail des ${pts} points`} style={{
                                fontSize:15, fontWeight:900, lineHeight:1,
                                color: pts === 0 ? 'var(--tx3)' : pts >= 3 ? '#FFD700' : 'var(--g)',
                                background:'none', border:0, padding:'3px 5px', margin:0, cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:3,
                              }}>
                                +{pts} pt{pts > 1 ? 's' : ''}
                              </button>
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
              </>}
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
