import { translateTeam } from '../utils/teamName'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { collection, getDocs, getDoc, getDocFromServer, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { issueMatch, calcPoints1N2, calcPointsScorer, isJackpotOn, getDcChoicesFor, joueurADevineIssue as joueurADevineIssuePure } from '../scoring'
import { useUser } from '../App'
import TeamLogo from '../components/TeamLogo'
import JerseyAvatar from '../components/JerseyAvatar'
import ErrorBoundary from '../components/ErrorBoundary'
import { GAINS_JOURNEE } from '../firebase/constants'
import { LIVE_ORDER, trierMatchsLive } from '../utils/liveMatchOrder'
import { coteEvenement, libelleMinuteEvenement } from '../utils/matchEvents'

const LIVE_ORDER_STORAGE_KEY = 'lachattefc.liveOrdreMatchs'
const LIVE_VIEW_STORAGE_KEY = 'lachattefc.liveVuePreferee'

function PronosChatteuxContent({ active = true }) {
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
  const [podiumVisible, setPodiumVisible] = useState(false)
  const [actualisation, setActualisation] = useState('idle')
  const [distanceTiree, setDistanceTiree] = useState(0)
  const [ordreMatchs, setOrdreMatchs] = useState(() => {
    try {
      const memorise = window.localStorage.getItem(LIVE_ORDER_STORAGE_KEY)
      return Object.values(LIVE_ORDER).includes(memorise) ? memorise : LIVE_ORDER.A_JOUER
    } catch {
      return LIVE_ORDER.A_JOUER
    }
  })
  const [vuePreferee, setVuePreferee] = useState(() => {
    try {
      return window.localStorage.getItem(LIVE_VIEW_STORAGE_KEY) === 'synthese' ? 'synthese' : 'detail'
    } catch {
      return 'detail'
    }
  })
  const debutTirer = useRef(null)
  const distanceTireeRef = useRef(0)

  useEffect(() => {
    try {
      window.localStorage.setItem(LIVE_ORDER_STORAGE_KEY, ordreMatchs)
    } catch {
      // Le tri reste utilisable même si le stockage local est indisponible.
    }
  }, [ordreMatchs])

  useEffect(() => {
    try {
      window.localStorage.setItem(LIVE_VIEW_STORAGE_KEY, vuePreferee)
    } catch {
      // La vue reste sélectionnable pendant la session si le stockage échoue.
    }
  }, [vuePreferee])

  useEffect(() => {
    if (!active) return
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
        if (defaultJ && !selectedJId) setSelectedJId(defaultJ.id)
        else setLoadingJournee(false)
        setLoading(false)
      } catch(e) {
        console.error(e)
        setLoading(false)
      }
    }
    load()
  }, [active])

  useEffect(() => {
    if (!active || !selectedJId) return
    let unsub = null
    let annule = false

    const load = async () => {
      try {
        if (!journee) setLoadingJournee(true)
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
  }, [active, selectedJId])

  const rafraichirJournee = async () => {
    if (!selectedJId || actualisation === 'loading') return
    setActualisation('loading')
    try {
      const snapshot = await getDocFromServer(doc(db, 'journees', selectedJId))
      if (snapshot.exists()) setJournee({ id:snapshot.id, ...snapshot.data() })
      setActualisation('done')
    } catch (e) {
      console.error('Erreur actualisation manuelle du Live:', e)
      setActualisation('error')
    } finally {
      window.setTimeout(() => setActualisation('idle'), 1600)
    }
  }

  const commencerTirer = e => {
    const zone = e.currentTarget.closest('.screen-content')
    if ((zone?.scrollTop || 0) <= 0) debutTirer.current = e.touches[0].clientY
  }

  const continuerTirer = e => {
    if (debutTirer.current === null || actualisation === 'loading') return
    const distance = Math.max(0, e.touches[0].clientY - debutTirer.current)
    distanceTireeRef.current = Math.min(90, distance * 0.55)
    setDistanceTiree(distanceTireeRef.current)
  }

  const terminerTirer = () => {
    const doitActualiser = distanceTireeRef.current >= 55
    debutTirer.current = null
    distanceTireeRef.current = 0
    setDistanceTiree(0)
    if (doitActualiser) rafraichirJournee()
  }

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
        <img
          src="/icon-512.png"
          alt="La Chatte FC"
          style={{ width:88, height:'auto', marginBottom:16 }}
        />
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

  // Construire la liste sans modifier les clés d'origine des pronos. Le
  // joueur peut ensuite choisir le tri chronologique strict ou conserver
  // les matchs à jouer devant les rencontres terminées.
  const matchBlocks = trierMatchsLive([
    scorer?.dom ? { key:'scorer', dom: scorer.dom, ext: scorer.ext, jour: scorer.jour, heure: scorer.heure, utcDate: scorer.utcDate, isScorer: true, label: '⚽ Match Scorer', ordreInitial: -1 } : null,
    ...matchesMain.map((m, i) => ({ key: `l1_${i}`, dom: m.dom, ext: m.ext, jour: m.jour, heure: m.heure, utcDate: m.utcDate, label: `Match ${i+1}`, isMatchScorer: m.scorer === true, ordreInitial: i })),
    euro ? { key:'euro', dom: euro.dom, ext: euro.ext, jour: euro.jour, heure: euro.heure, utcDate: euro.utcDate, isEuro: true, label: '🌍 Affiche Européenne', ordreInitial: matchesMain.length + 1 } : null,
  ].filter(Boolean), journee.resultats, ordreMatchs)

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
    if (missile) raison += ` · Prono imposé par missile (${missile.lanceurNom || joueurs.find(j => j.id === missile.lanceur)?.nom?.split(' ')[0] || '?'})`

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

  const renderCarteSynthese = match => {
    const res = journee.resultats?.[match.key]
    const scoreVisible = res && ['FINISHED', 'IN_PLAY', 'PAUSED'].includes(res.status)
      && res.h !== null && res.a !== null
    const issueActuelle = scoreVisible ? issueMatch(Number(res.h), Number(res.a)) : null
    const estScorer = match.isScorer || match.isMatchScorer || journee.scorerOnly
    const isLive = res?.status === 'IN_PLAY'
    const isPaused = res?.status === 'PAUSED'
    const isFinished = res?.status === 'FINISHED'
    const statut = isLive ? '🔴 EN LIVE' : isPaused ? '🟠 MI-TEMPS' : isFinished ? '🟢 TERMINÉ' : '🔵 À VENIR'
    const couleurStatut = isLive ? '#FF4444' : isPaused ? 'var(--a)' : isFinished ? 'var(--g)' : 'var(--b)'
    const palettes = {
      '1': { couleur:'var(--b)', fond:'rgba(96,165,250,.10)', actif:'rgba(96,165,250,.24)' },
      'N': { couleur:'var(--a)', fond:'rgba(251,191,36,.09)', actif:'rgba(251,191,36,.22)' },
      '2': { couleur:'var(--p)', fond:'rgba(192,132,252,.10)', actif:'rgba(192,132,252,.23)' },
    }
    const joueursAbsents = joueurs.filter(joueur => !pronos[joueur.id])
    const evenements = [
      ...(res?.buts || []).map(evenement => ({ ...evenement, nature:'but' })),
      ...(res?.cartonsRouges || []).map(evenement => ({ ...evenement, nature:'rouge' })),
    ].sort((a, b) => (a.minute || 0) - (b.minute || 0) || (a.injuryTime || 0) - (b.injuryTime || 0))
    const coteDe = evenement => evenement.cote || coteEvenement(evenement.equipe, match.dom, match.ext)
    const evenementsDom = evenements.filter(evenement => coteDe(evenement) === 'domicile')
    const evenementsExt = evenements.filter(evenement => coteDe(evenement) === 'exterieur')

    const evenementCompact = (evenement, cote, index) => {
      const minute = libelleMinuteEvenement(evenement)
      const penalty = evenement.nature === 'but' && /penalty/i.test(evenement.type || '')
      return (
        <div key={`${cote}-${evenement.nature}-${evenement.joueur}-${index}`} style={{ display:'flex', alignItems:'flex-start', justifyContent:cote === 'domicile' ? 'flex-start' : 'flex-end', gap:4, textAlign:cote === 'domicile' ? 'left' : 'right', fontSize:9, lineHeight:1.25 }}>
          {cote === 'domicile' && <span>{evenement.nature === 'rouge' ? '🟥' : '⚽'}</span>}
          <span style={{ minWidth:0, overflowWrap:'anywhere', color:'var(--tx2)', fontWeight:750 }}>
            {evenement.joueur || 'Joueur inconnu'}
            {(minute || penalty) && <span style={{ color:evenement.nature === 'rouge' ? 'var(--r)' : 'var(--tx3)', whiteSpace:'nowrap' }}> ({minute}{penalty ? `${minute ? ' ' : ''}PEN` : ''})</span>}
          </span>
          {cote === 'exterieur' && <span>{evenement.nature === 'rouge' ? '🟥' : '⚽'}</span>}
        </div>
      )
    }

    const choixDuJoueur = (joueur, issue) => {
      const prono = getProno(joueur.id, match.key)
      if (!prono?.val) return false
      if (estScorer) {
        const score = String(prono.val).match(/^(\d+)-(\d+)$/)
        return !!score && issueMatch(Number(score[1]), Number(score[2])) === issue
      }
      return String(prono.val).split('/').includes(issue)
    }

    // Un joueur en Double Chance (ou scorer) n'a qu'un seul total de points
    // pour ce match, mais peut apparaître dans 2 colonnes (ses 2 issues
    // couvertes). On choisit UNE colonne d'affichage par joueur pour éviter
    // d'afficher le même "+X pt" en double — priorité à l'issue réelle du
    // match si elle fait partie de son pari, sinon la première de ses issues.
    const colonnePointsParJoueur = {}
    joueursTriés.forEach(joueur => {
      const prono = getProno(joueur.id, match.key)
      if (!prono?.val) return
      let colonne = null
      if (estScorer) {
        const score = String(prono.val).match(/^(\d+)-(\d+)$/)
        colonne = score ? issueMatch(Number(score[1]), Number(score[2])) : null
      } else {
        const choix = String(prono.val).split('/')
        colonne = (issueActuelle && choix.includes(issueActuelle)) ? issueActuelle : choix[0]
      }
      colonnePointsParJoueur[joueur.id] = colonne
    })

    return (
      <div key={match.key} style={{ overflow:'hidden', borderRadius:16, background:'var(--bg2)', border:`1px solid ${estScorer ? 'rgba(255,215,0,.52)' : 'var(--bd)'}`, boxShadow:estScorer ? '0 0 18px rgba(255,215,0,.10)' : '0 8px 20px rgba(0,0,0,.18)' }}>
        <div style={{ padding:'11px 12px 10px', display:'grid', gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)', alignItems:'center', gap:7, borderBottom:'1px solid var(--bd)', background:estScorer ? 'linear-gradient(135deg, rgba(255,215,0,.08), rgba(255,255,255,.02))' : 'rgba(255,255,255,.025)' }}>
          <div style={{ minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' }}>
            <TeamLogo name={match.dom} size={27} />
            <strong style={{ maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', fontSize:11, textTransform:'uppercase' }}>{translateTeam(match.dom)}</strong>
          </div>
          <div style={{ minWidth:70, textAlign:'center' }}>
            {estScorer && <div style={{ marginBottom:3, fontSize:8, fontWeight:900, color:'#FFD700' }}>🎯 SCORER</div>}
            <div style={{ fontFamily:'var(--D)', fontSize:scoreVisible ? 22 : 11, fontWeight:900, color:'var(--tx)' }}>
              {scoreVisible ? `${res.h} - ${res.a}` : (match.jour || match.heure) ? (
                <>
                  {match.jour && <div style={{ fontSize:8, fontWeight:800, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.03em' }}>{match.jour}</div>}
                  <div>{match.heure || 'VS'}</div>
                </>
              ) : 'VS'}
            </div>
            <div style={{ marginTop:2, fontSize:8, fontWeight:900, color:couleurStatut }}>{statut}</div>
          </div>
          <div style={{ minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' }}>
            <TeamLogo name={match.ext} size={27} />
            <strong style={{ maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', fontSize:11, textTransform:'uppercase' }}>{translateTeam(match.ext)}</strong>
          </div>
        </div>

        {evenements.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 1px minmax(0,1fr)', gap:7, padding:'8px 9px', borderBottom:'1px solid var(--bd)', background:'rgba(0,0,0,.13)' }}>
            <div style={{ minWidth:0, display:'flex', flexDirection:'column', gap:5 }}>
              {evenementsDom.length > 0 ? evenementsDom.map((evenement, index) => evenementCompact(evenement, 'domicile', index)) : <span style={{ color:'var(--tx3)', fontSize:9 }}>—</span>}
            </div>
            <div aria-hidden="true" style={{ width:1, background:'rgba(255,255,255,.09)' }} />
            <div style={{ minWidth:0, display:'flex', flexDirection:'column', gap:5 }}>
              {evenementsExt.length > 0 ? evenementsExt.map((evenement, index) => evenementCompact(evenement, 'exterieur', index)) : <span style={{ color:'var(--tx3)', fontSize:9, textAlign:'right' }}>—</span>}
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))' }}>
          {['1','N','2'].map((issue, colonne) => {
            const palette = palettes[issue]
            const liste = joueursTriés.filter(joueur => pronos[joueur.id] && choixDuJoueur(joueur, issue))
            return (
              <div key={issue} style={{ minWidth:0, minHeight:112, background:issueActuelle === issue ? palette.actif : palette.fond, borderLeft:colonne ? '1px solid var(--bd)' : 0 }}>
                <div style={{ padding:'7px 3px', textAlign:'center', borderBottom:'1px solid var(--bd)', color:palette.couleur, fontFamily:'var(--D)', fontSize:18, fontWeight:900 }}>{issue}</div>
                <div style={{ padding:'7px 4px 9px', display:'flex', flexDirection:'column', gap:7 }}>
                  {liste.length === 0 && <span style={{ textAlign:'center', color:'var(--tx3)', fontSize:11 }}>—</span>}
                  {liste.map(joueur => {
                    const prono = getProno(joueur.id, match.key)
                    const points = getPtsMatch(joueur.id, match.key, match.isScorer)
                    const surprise = isSurprise(joueur.id, match.key, match.isScorer)
                    const correct = getCorrect(joueur.id, match.key, match.isScorer)
                    const explication = points !== null
                      ? expliquerPoints(joueur.id, match.key, match.isScorer, correct, points, surprise)
                      : null
                    const bonus = getBonusLabels(joueur.id, match.key).map(item => item.icon).join('')
                    const missileObj = missiles.find(m => m.cible === joueur.id && m.matchKey === match.key && m.applique)
                    const estMoi = joueur.id === profil?.id
                    return (
                      <div key={joueur.id} style={{ textAlign:'center', color:estMoi ? 'var(--g)' : 'var(--tx)', fontSize:10, fontWeight:estMoi ? 900 : 700, lineHeight:1.25, overflowWrap:'anywhere' }}>
                        <div>{missileObj && (
                          <span
                            title={`Prono imposé par missile (${missileObj.lanceurNom || joueurs.find(j => j.id === missileObj.lanceur)?.nom?.split(' ')[0] || '?'})`}
                            aria-label={`Missile de ${missileObj.lanceurNom || joueurs.find(j => j.id === missileObj.lanceur)?.nom?.split(' ')[0] || '?'}`}
                            style={{ cursor:'help' }}
                          >🚀</span>
                        )}{bonus}{surprise ? '⚡' : ''}{joueur.nom?.split(' ')[0] || joueur.initiales || '?'}</div>
                        {estScorer && <div style={{ color:palette.couleur, fontSize:9 }}>{prono?.val}</div>}
                        {points !== null && colonnePointsParJoueur[joueur.id] === issue && (
                          <button
                            type="button"
                            onClick={() => explication && setDetailPoints(explication)}
                            disabled={!explication}
                            aria-label={`Voir le détail des ${points} points de ${joueur.nom?.split(' ')[0] || 'ce joueur'}`}
                            style={{ margin:'1px auto 0', padding:'2px 4px', border:0, background:'none', color:points > 0 ? 'var(--g)' : 'var(--tx3)', fontSize:9, fontWeight:900, cursor:explication ? 'pointer' : 'default', textDecoration:'underline', textDecorationStyle:'dotted', textUnderlineOffset:2 }}
                          >
                            +{points} pt{points > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        {joueursAbsents.length > 0 && (
          <div style={{ padding:'7px 10px', borderTop:'1px solid var(--bd)', color:'var(--r)', fontSize:9, fontWeight:800 }}>
            ABS · {joueursAbsents.map(joueur => joueur.nom?.split(' ')[0] || joueur.initiales).join(', ')}
          </div>
        )}
      </div>
    )
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
  const nbReportes = statutsMatchs.filter(status => status === 'POSTPONED').length
  const nbAVenir = statutsMatchs.filter(status => !['IN_PLAY', 'PAUSED', 'FINISHED', 'POSTPONED'].includes(status)).length
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
    nbLive > 0 ? { texte:`🔴 ${nbLive} match${nbLive > 1 ? 's' : ''} en live`, couleur:'#FF4444' } : null,
    nbPause > 0 ? { texte:`🟠 ${nbPause} match${nbPause > 1 ? 's' : ''} en pause`, couleur:'var(--a)' } : null,
    nbTermines > 0 ? { texte:`🟢 ${nbTermines} match${nbTermines > 1 ? 's' : ''} terminé${nbTermines > 1 ? 's' : ''}`, couleur:'var(--g)' } : null,
    nbAVenir > 0 ? { texte:`🔵 ${nbAVenir} match${nbAVenir > 1 ? 's' : ''} à venir`, couleur:'var(--b)' } : null,
    nbReportes > 0 ? { texte:`⚠️ ${nbReportes} match${nbReportes > 1 ? 's' : ''} reporté${nbReportes > 1 ? 's' : ''}`, couleur:'var(--r)' } : null,
  ].filter(Boolean)

  return (
    <div
      onTouchStart={commencerTirer}
      onTouchMove={continuerTirer}
      onTouchEnd={terminerTirer}
      onTouchCancel={terminerTirer}
      style={{ padding:'16px 0 32px', position:'relative' }}
    >
      {(distanceTiree > 0 || actualisation !== 'idle') && (
        <div style={{ height:distanceTiree || 38, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--g)', fontSize:12, fontWeight:900, transition:distanceTiree ? 'none' : 'height .2s ease' }}>
          {actualisation === 'loading' ? '↻ Actualisation…' : actualisation === 'done' ? '✓ Live actualisé' : actualisation === 'error' ? '⚠️ Actualisation impossible' : distanceTiree >= 55 ? 'Relâche pour actualiser' : '↓ Tire pour actualiser'}
        </div>
      )}
      {detailPoints && createPortal(
        <div onClick={() => setDetailPoints(null)} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.72)', display:'flex', alignItems:'flex-end', justifyContent:'center', overflowY:'auto', padding:'16px 16px max(16px, env(safe-area-inset-bottom))' }}>
          <div role="dialog" aria-modal="true" aria-label="Détail des points" onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:420, maxHeight:'calc(100dvh - 32px - env(safe-area-inset-bottom))', overflowY:'auto', padding:'20px 18px', borderRadius:'18px 18px 12px 12px', background:'var(--bg2)', border:'1px solid var(--bd2)', boxShadow:'0 -10px 40px rgba(0,0,0,.45)', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--D)', fontSize:30, fontWeight:900, color:detailPoints.points >= 3 ? '#FFD700' : detailPoints.points > 0 ? 'var(--g)' : 'var(--tx3)' }}>
              +{detailPoints.points} pt{detailPoints.points > 1 ? 's' : ''}
            </div>
            <div style={{ marginTop:6, fontSize:15, fontWeight:900, color:'var(--tx)' }}>{detailPoints.raison}</div>
            {detailPoints.repartition && <div style={{ marginTop:7, fontSize:12, color:'var(--p)', fontWeight:700 }}>⚡ {detailPoints.repartition}</div>}
            <button type="button" className="btn btn-secondary" onClick={() => setDetailPoints(null)} style={{ width:'100%', marginTop:18 }}>Fermer</button>
          </div>
        </div>,
        document.body
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
        <div className="live-dashboard" style={{ margin:'0 12px 24px', padding:'15px', borderRadius:18, background:'linear-gradient(145deg, rgba(8,20,34,.98), rgba(14,31,29,.96))', border:'1.5px solid rgba(248,68,68,.30)', boxShadow:'0 10px 28px rgba(0,0,0,.34), 0 0 22px rgba(248,68,68,.08)', position:'relative', overflow:'hidden' }}>
          <div style={{ fontSize:10, fontWeight:900, letterSpacing:'.12em', color:'var(--tx)', textTransform:'uppercase', marginBottom:10 }}>
            ⚡ Ma situation live
          </div>
          <div style={{ marginBottom:13, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:5 }}>
            {resumeMatchs.length > 0 ? resumeMatchs.map(item => (
              <div key={item.texte} style={{ fontSize:11, fontWeight:900, letterSpacing:'.07em', color:item.couleur, textTransform:'uppercase' }}>
                {item.texte}
              </div>
            )) : (
              <div style={{ fontSize:11, fontWeight:900, letterSpacing:'.07em', color:'var(--b)', textTransform:'uppercase' }}>🔵 Matchs à venir</div>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
            <div style={{ padding:'10px 6px', borderRadius:'var(--Rs)', background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.065)', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--D)', fontSize:22, color:'var(--tx)', fontWeight:900 }}>{calculProvisoireActif ? maSituation.pointsProvisoires : '—'}</div>
              <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:800 }}>POINTS PROV.</div>
            </div>
            <div style={{ padding:'10px 6px', borderRadius:'var(--Rs)', background:'rgba(96,165,250,.07)', border:'1px solid rgba(96,165,250,.13)', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--D)', fontSize:22, color:'var(--b)', fontWeight:900 }}>{calculProvisoireActif ? rangLibelle : '—'}</div>
              <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:800 }}>CLASSEMENT</div>
            </div>
            <div style={{ padding:'10px 6px', borderRadius:'var(--Rs)', background:'rgba(155,226,45,.06)', border:'1px solid rgba(155,226,45,.12)', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--D)', fontSize:22, color:maSituation.gainProvisoire > 0 ? 'var(--g)' : 'var(--tx3)', fontWeight:900 }}>{calculProvisoireActif ? `${maSituation.gainProvisoire.toFixed(2)}€` : '—'}</div>
              <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:800 }}>GAIN PROV.</div>
            </div>
          </div>
          {calculProvisoireActif && (
            <div style={{ marginTop:11, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.07)' }}>
              <button
                type="button"
                onClick={() => setPodiumVisible(visible => !visible)}
                aria-expanded={podiumVisible}
                style={{ width:'100%', border:0, background:'none', color:'#FFD700', fontSize:11, fontWeight:900, letterSpacing:'.045em', cursor:'pointer', padding:'3px 0' }}
              >
                {podiumVisible ? '▲ Masquer le podium' : '🏆 Voir le podium provisoire'}
              </button>
              {podiumVisible && (
                <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                  {classementProvisoire.slice(0, 3).map(joueur => {
                    const estMoi = joueur.id === profil?.id
                    const medaille = joueur.rang === 1 ? '🥇' : joueur.rang === 2 ? '🥈' : '🥉'
                    return (
                      <div key={joueur.id} style={{ display:'grid', gridTemplateColumns:'26px minmax(0, 1fr) auto auto', alignItems:'center', gap:7, padding:'7px 9px', borderRadius:'var(--Rs)', background:estMoi ? 'rgba(155,226,45,.09)' : 'rgba(255,255,255,.035)', border:`1px solid ${estMoi ? 'rgba(155,226,45,.22)' : 'rgba(255,255,255,.055)'}` }}>
                        <span style={{ fontSize:17 }}>{medaille}</span>
                        <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12, fontWeight:900, color:estMoi ? 'var(--g)' : 'var(--tx)' }}>{joueur.nom?.split(' ')[0] || joueur.initiales || '?'}</span>
                        <span style={{ fontSize:11, fontWeight:900, color:'var(--tx2)', whiteSpace:'nowrap' }}>{joueur.pointsProvisoires} pts</span>
                        <span style={{ minWidth:48, textAlign:'right', fontSize:11, fontWeight:900, color:joueur.gainProvisoire > 0 ? 'var(--g)' : 'var(--tx3)', whiteSpace:'nowrap' }}>{joueur.gainProvisoire.toFixed(2)}€</span>
                      </div>
                    )
                  })}
                  {maSituation.rang > 3 && (
                    <div style={{ textAlign:'center', marginTop:2, fontSize:10, color:'var(--tx3)', fontWeight:800 }}>
                      Ton classement : <span style={{ color:'var(--b)' }}>{rangLibelle} sur {joueurs.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {erreur && (
        <div style={{ margin:'0 12px 12px', padding:'12px 14px', background:'rgba(252,165,165,.08)', border:'1px solid rgba(252,165,165,.25)', borderRadius:'var(--Rs)', fontSize:13, color:'#FCA5A5' }}>
          {erreur}
        </div>
      )}

      <div style={{ padding:'0 16px 9px', display:'flex', flexDirection:'column', gap:9 }}>
        <div style={{ fontSize:10, fontWeight:900, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.11em' }}>
          ⚽ Matchs de la journée
        </div>
        <div role="group" aria-label="Vue des pronostics" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', padding:3, borderRadius:12, background:'rgba(255,255,255,.045)', border:'1px solid var(--bd)' }}>
          {[
            ['detail', '☷ Vue détaillée'],
            ['synthese', '▦ Vue synthèse'],
          ].map(([valeur, libelle]) => {
            const actif = vuePreferee === valeur
            return (
              <button
                key={valeur}
                type="button"
                aria-pressed={actif}
                onClick={() => setVuePreferee(valeur)}
                style={{ border:0, borderRadius:9, padding:'9px 6px', background:actif ? 'rgba(192,132,252,.15)' : 'transparent', color:actif ? 'var(--p)' : 'var(--tx3)', boxShadow:actif ? 'inset 0 0 0 1px rgba(192,132,252,.28)' : 'none', fontSize:10, fontWeight:900, cursor:'pointer' }}
              >
                {libelle}
              </button>
            )
          })}
        </div>
        <div role="group" aria-label="Ordre d’affichage des matchs" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', padding:3, borderRadius:12, background:'rgba(255,255,255,.045)', border:'1px solid var(--bd)' }}>
          {[
            [LIVE_ORDER.CHRONOLOGIQUE, '🕐 Chronologique'],
            [LIVE_ORDER.A_JOUER, '⚡ À jouer en premier'],
          ].map(([valeur, libelle]) => {
            const actif = ordreMatchs === valeur
            return (
              <button
                key={valeur}
                type="button"
                aria-pressed={actif}
                onClick={() => setOrdreMatchs(valeur)}
                style={{ border:0, borderRadius:9, padding:'8px 6px', background:actif ? 'rgba(155,226,45,.14)' : 'transparent', color:actif ? 'var(--g)' : 'var(--tx3)', boxShadow:actif ? 'inset 0 0 0 1px rgba(155,226,45,.25)' : 'none', fontSize:10, fontWeight:900, cursor:'pointer' }}
              >
                {libelle}
              </button>
            )
          })}
        </div>
      </div>

      {vuePreferee === 'synthese' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'0 12px' }}>
          {matchBlocks.map(renderCarteSynthese)}
        </div>
      )}

      {/* Blocs détaillés par match */}
      {vuePreferee === 'detail' && <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'0 12px' }}>
        {matchBlocks.map(match => {
          const res = journee.resultats?.[match.key]
          const hasScore = res && (res.status === 'FINISHED' || res.status === 'IN_PLAY' || res.status === 'PAUSED') && res.h !== null && res.a !== null
          const isLive = res?.status === 'IN_PLAY'
          const isPaused = res?.status === 'PAUSED'
          const isFinished = res?.status === 'FINISHED'
          const isPostponed = res?.status === 'POSTPONED'
          const estMatchScorer = match.isScorer || match.isMatchScorer || journee.scorerOnly
          const monProno = profil?.id ? getProno(profil.id, match.key) : null
          const paletteMonProno = monProno
            ? getPendingPronoPalette(monProno, estMatchScorer)
            : { color:'var(--r)', background:'rgba(248,68,68,.10)', border:'rgba(248,68,68,.35)' }
          const mesPoints = profil?.id ? getPtsMatch(profil.id, match.key, match.isScorer) : null
          const monDetailPoints = profil?.id && mesPoints !== null
            ? expliquerPoints(
                profil.id,
                match.key,
                match.isScorer,
                getCorrect(profil.id, match.key, match.isScorer),
                mesPoints,
                isSurprise(profil.id, match.key, match.isScorer)
              )
            : null
          const couleurMesPoints = !monProno
            ? 'var(--r)'
            : mesPoints >= 3
              ? '#FFD700'
              : mesPoints === 2
                ? 'var(--g)'
                : mesPoints === 1
                  ? 'var(--b)'
                  : 'var(--tx3)'
          const fondMesPoints = !monProno
            ? 'rgba(248,68,68,.10)'
            : mesPoints >= 3
              ? 'rgba(255,215,0,.10)'
              : mesPoints === 2
                ? 'rgba(155,226,45,.10)'
                : mesPoints === 1
                  ? 'rgba(96,165,250,.10)'
                  : 'rgba(255,255,255,.04)'
          const bordMesPoints = !monProno
            ? 'rgba(248,68,68,.42)'
            : mesPoints >= 3
              ? 'rgba(255,215,0,.42)'
              : mesPoints === 2
                ? 'rgba(155,226,45,.42)'
                : mesPoints === 1
                  ? 'rgba(96,165,250,.42)'
                  : 'var(--bd)'
          const cleCarte = `${journee.id}:${match.key}`
          const statutCarte = res?.status || 'SCHEDULED'
          const ouvertureAuto = isLive || isPaused
          const choixManuel = cartesDepliees[cleCarte]
          const carteDepliee = choixManuel?.statut === statutCarte ? choixManuel.ouverte : ouvertureAuto
          const evenementsMatch = [
            ...(res?.buts || []).map(evenement => ({ ...evenement, nature:'but' })),
            ...(res?.cartonsRouges || []).map(evenement => ({ ...evenement, nature:'rouge' })),
          ].sort((a, b) => (a.minute || 0) - (b.minute || 0) || (a.injuryTime || 0) - (b.injuryTime || 0))
          const coteDe = evenement => evenement.cote || coteEvenement(evenement.equipe, match.dom, match.ext)
          const evenementsDom = evenementsMatch.filter(evenement => coteDe(evenement) === 'domicile')
          const evenementsExt = evenementsMatch.filter(evenement => coteDe(evenement) === 'exterieur')

          const afficherEvenement = (evenement, index, cote) => {
            const minute = libelleMinuteEvenement(evenement)
            const penalty = evenement.nature === 'but' && /penalty/i.test(evenement.type || '')
            const icone = evenement.nature === 'rouge' ? '🟥' : '⚽'
            const texte = (
              <span style={{ minWidth:0, overflowWrap:'anywhere', fontSize:10, lineHeight:1.25, color:'var(--tx)', fontWeight:850 }}>
                <span>{evenement.joueur || 'Joueur inconnu'}</span>
                {(minute || penalty) && <span style={{ color:evenement.nature === 'rouge' ? 'var(--r)' : 'var(--tx2)', whiteSpace:'nowrap' }}> ({minute}{penalty ? `${minute ? ' ' : ''}PEN` : ''})</span>}
                {evenement.nature === 'but' && evenement.passeur && <span style={{ display:'block', marginTop:2, color:'var(--tx3)', fontSize:8, fontWeight:650 }}>Passe : {evenement.passeur}</span>}
              </span>
            )
            return (
              <div key={`${cote}-${evenement.nature}-${evenement.minute}-${evenement.joueur}-${index}`} style={{ display:'grid', gridTemplateColumns:cote === 'domicile' ? '16px minmax(0, 1fr)' : 'minmax(0, 1fr) 16px', alignItems:'start', gap:4, textAlign:cote === 'domicile' ? 'left' : 'right' }}>
                {cote === 'domicile' ? <><span style={{ fontSize:11 }}>{icone}</span>{texte}</> : <>{texte}<span style={{ fontSize:11 }}>{icone}</span></>}
              </div>
            )
          }

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
                  {isLive ? 'LIVE' : isPaused ? '⏸ MI-TEMPS' : isFinished ? '✓ TERMINÉ' : isPostponed ? '⚠️ REPORTÉ' : '🕐 À VENIR'}
                </div>

                {/* Score et points personnels visibles sans déplier la carte */}
                {(hasScore || profil?.id) && (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:7 }}>
                    {hasScore && (
                      <div style={{
                        fontFamily:'var(--D)', fontSize:21, fontWeight:900, letterSpacing:'.04em',
                        color:'var(--tx)', display:'flex', alignItems:'center',
                        padding:'5px 12px', borderRadius:'var(--Rs)', flexShrink:0,
                        background: isLive ? 'rgba(248,68,68,.10)' : isPaused ? 'var(--a-dim)' : isFinished ? 'rgba(155,226,45,.08)' : 'rgba(255,255,255,.05)',
                        border: `1px solid ${isLive ? 'rgba(248,68,68,.4)' : isPaused ? 'var(--a-b)' : isFinished ? 'var(--g-b)' : 'var(--bd)'}`,
                        whiteSpace:'nowrap',
                      }}>
                        {res.h} - {res.a}
                      </div>
                    )}
                    {profil?.id && (
                      <div style={{ display:'flex', alignItems:'stretch', justifyContent:'center', gap:7 }}>
                        <div style={{
                          width:108, minHeight:42, padding:'4px 10px', boxSizing:'border-box', borderRadius:'var(--Rs)',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          background:paletteMonProno.background,
                          border:`1px solid ${paletteMonProno.border}`,
                          color:paletteMonProno.color,
                          whiteSpace:'nowrap',
                        }}>
                          <span style={{ fontSize:7, fontWeight:900, letterSpacing:'.08em', lineHeight:1.1 }}>MON PRONO</span>
                          <strong style={{ marginTop:2, fontFamily:'var(--D)', fontSize:15, lineHeight:1 }}>
                            {monProno?.val || 'ABS'}
                          </strong>
                        </div>
                        {isFinished && (
                          <button
                            type="button"
                            onClick={() => monDetailPoints && setDetailPoints(monDetailPoints)}
                            disabled={!monDetailPoints}
                            aria-label={monProno ? `Mes points : ${mesPoints}` : 'Pronostic absent'}
                            style={{
                              width:108, minHeight:42, padding:'4px 10px', boxSizing:'border-box', borderRadius:'var(--Rs)',
                              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                              background:fondMesPoints,
                              border:`1px solid ${bordMesPoints}`,
                              color:couleurMesPoints, cursor:monDetailPoints ? 'pointer' : 'default',
                              fontFamily:'inherit', opacity:1,
                            }}
                          >
                            <span style={{ fontSize:7, fontWeight:900, letterSpacing:'.08em', lineHeight:1.1 }}>MES POINTS</span>
                            <strong style={{ marginTop:2, fontFamily:'var(--D)', fontSize:15, lineHeight:1, whiteSpace:'nowrap' }}>
                              {monProno && mesPoints !== null ? `+${mesPoints} PT${mesPoints > 1 ? 'S' : ''}` : 'ABS'}
                            </strong>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {evenementsMatch.length > 0 && (
                  <div style={{ width:'100%', marginTop:2, padding:'8px 9px 9px', borderRadius:'var(--Rs)', background:'rgba(0,0,0,.18)', border:'1px solid rgba(255,255,255,.065)' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) 1px minmax(0, 1fr)', gap:8 }}>
                      <div style={{ minWidth:0, display:'flex', flexDirection:'column', gap:6 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:8, color:'var(--tx3)', fontWeight:900, textTransform:'uppercase', letterSpacing:'.04em', textAlign:'left' }}>{translateTeam(match.dom)}</div>
                        {evenementsDom.map((evenement, index) => afficherEvenement(evenement, index, 'domicile'))}
                      </div>
                      <div aria-hidden="true" style={{ width:1, background:'rgba(255,255,255,.09)' }} />
                      <div style={{ minWidth:0, display:'flex', flexDirection:'column', gap:6 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:8, color:'var(--tx3)', fontWeight:900, textTransform:'uppercase', letterSpacing:'.04em', textAlign:'right' }}>{translateTeam(match.ext)}</div>
                        {evenementsExt.map((evenement, index) => afficherEvenement(evenement, index, 'exterieur'))}
                      </div>
                    </div>
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
      </div>}
    </div>
  )
}

export default function PronosChatteux({ active = true }) {
  return <ErrorBoundary><PronosChatteuxContent active={active} /></ErrorBoundary>
}
