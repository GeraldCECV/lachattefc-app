import { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useUser } from '../App';
import JerseyAvatar from '../components/JerseyAvatar';
import {
  issueMatch,
  calcPointsScorer,
  calcPoints1N2,
  isJackpotOn,
  getDcChoicesFor,
  joueurADevineIssue,
} from '../scoring';

const BAREME = [24, 16, 12, 9, 7, 5, 4, 3];

const COLORS = [
  ['rgba(255,215,0,.14)', '#FFD700'],
  ['rgba(192,192,192,.12)', '#C0C0C0'],
  ['rgba(205,127,50,.12)', '#CD7F32'],
  ['rgba(96,165,250,.12)', '#93C5FD'],
  ['rgba(155,226,45,.12)', '#9BE22D'],
  ['rgba(192,132,252,.12)', '#DDD6FE'],
  ['rgba(251,191,36,.12)', '#FCD34D'],
  ['rgba(248,113,113,.12)', '#FCA5A5'],
  ['rgba(20,184,166,.12)', '#5EEAD4'],
  ['rgba(251,146,60,.12)', '#FDBA74'],
];
const getC = (i) => COLORS[i % COLORS.length];

export default function Classement() {
  const { profil } = useUser();
  const [tab, setTab] = useState('journee');
  const [historiqueList, setHistoriqueList] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [selectedHistJ, setSelectedHistJ] = useState(null);
  const [joueursMap, setJoueursMap] = useState({});
  const [journee, setJournee] = useState(null);
  const [classJ, setClassJ] = useState([]);
  const [classG, setClassG] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubJournee = null,
      unsubPronos = null,
      unsubMissiles = null;
    let map = {};
    let journeeData = null;
    let pronosMap = {};
    let missiles = [];

    const recalc = () => {
      if (!journeeData) return;
      const data = journeeData;
      const matches = data.matchesL1 || [];
      const resultats = data.resultats || {};
      const penalites = data.penalites || {};
      const pointsParJoueur = {};
      Object.keys(map).forEach((uid) => {
        pointsParJoueur[uid] = penalites[uid] || 0;
      });

      const pronosAvecMissiles = JSON.parse(JSON.stringify(pronosMap));
      missiles.forEach((m) => {
        if (!m.applique) return;
        if (m.matchKey?.startsWith('l1_') && pronosAvecMissiles[m.cible]) {
          const i = parseInt(m.matchKey.replace('l1_', ''));
          if (!pronosAvecMissiles[m.cible].matchesL1) pronosAvecMissiles[m.cible].matchesL1 = [];
          pronosAvecMissiles[m.cible].matchesL1[i] = m.pronoImpose;
        }
        // DC annulée par le missile sur ce match (jackpot conservé) —
        // même règle que côté serveur : le missile prévaut sur la DC.
        const cibleData = pronosAvecMissiles[m.cible];
        if (cibleData && m.matchKey) {
          if (Array.isArray(cibleData.dcSelections)) {
            cibleData.dcSelections = cibleData.dcSelections.filter(
              (d) => d.matchKey !== m.matchKey
            );
          }
          if (cibleData.dcMatch === m.matchKey) {
            cibleData.dcMatch = null;
            cibleData.dcChoices = null;
          }
        }
      });

      const totalJoueurs = Object.keys(pronosMap).length;

      Object.keys(pronosMap).forEach((uid) => {
        const p = pronosAvecMissiles[uid];
        matches.forEach((m, i) => {
          const key = `l1_${i}`;
          const res = resultats[key];
          if (
            !res ||
            (res.status !== 'FINISHED' && res.status !== 'IN_PLAY' && res.status !== 'PAUSED') ||
            res.h === null
          )
            return;
          const rh = parseInt(res.h),
            ra = parseInt(res.a);
          const prono = p?.matchesL1?.[i];
          if (!prono) return;
          const isScorer = data.scorerOnly || m.scorer;
          if (isScorer) {
            const bonCountScorer = Object.values(pronosAvecMissiles).filter((pp) => {
              const pr = pp?.matchesL1?.[i];
              if (!pr || !/^\d+-\d+$/.test(pr)) return false;
              const [ph, pa] = pr.split('-').map(Number);
              return issueMatch(ph, pa) === issueMatch(rh, ra);
            }).length;
            pointsParJoueur[uid] =
              (pointsParJoueur[uid] || 0) +
              calcPointsScorer(prono, rh, ra, bonCountScorer, totalJoueurs);
          } else {
            const issue = issueMatch(rh, ra);
            const dcChoicesIci = getDcChoicesFor(p, key);
            if (dcChoicesIci?.length === 2) {
              // DC active sur ce match : exclusive — gagne (1 ou 2pts si jackpot) ou 0, jamais de repli sur le prono brut
              if (dcChoicesIci.includes(issue)) {
                pointsParJoueur[uid] = (pointsParJoueur[uid] || 0) + (isJackpotOn(p, key) ? 2 : 1);
              }
            } else if (prono === issue) {
              const bonCount = Object.keys(pronosMap).filter((u) =>
                joueurADevineIssue(pronosAvecMissiles[u], key, issue)
              ).length;
              pointsParJoueur[uid] =
                (pointsParJoueur[uid] || 0) +
                calcPoints1N2(p, prono, issue, bonCount, totalJoueurs, key);
            }
          }
        });
      });

      const auMoinsUnMatch = Object.values(resultats).some((r) =>
        ['FINISHED', 'IN_PLAY', 'PAUSED'].includes(r?.status)
      );
      const gains = {};
      if (auMoinsUnMatch) {
        const classement = Object.entries(pointsParJoueur).sort((a, b) => b[1] - a[1]);
        let i = 0;
        while (i < classement.length) {
          const pts = classement[i][1];
          let j = i;
          while (j < classement.length && classement[j][1] === pts) j++;
          let gainPartage = 0;
          for (let r = i + 1; r <= j; r++) gainPartage += BAREME[r - 1] || 0;
          const gainParJoueur = Math.round((gainPartage / (j - i)) * 100) / 100;
          for (let k = i; k < j; k++) gains[classement[k][0]] = gainParJoueur;
          i = j;
        }
      } else if (data.gainsJoueurs) {
        Object.assign(gains, data.gainsJoueurs);
      }

      setLastUpdate(new Date());
      setClassJ(
        applyDenseRank(
          Object.values(map)
            .map((j) => ({ ...j, ptsJ: pointsParJoueur[j.id] || 0, gainJ: gains[j.id] || 0 }))
            .sort((a, b) => b.gainJ - a.gainJ || b.ptsJ - a.ptsJ)
        )
      );

      // Classement Général en live : si la journée courante n'est pas encore
      // officiellement clôturée (statut !== 'resultats'), on ajoute ses points
      // en cours par-dessus les totaux déjà clôturés stockés sur chaque joueur
      // (gainsTotal/journeesJouees). Une fois la journée clôturée côté serveur,
      // ces champs stockés incluent déjà cette journée — on n'additionne alors
      // plus rien pour éviter un double comptage.
      if (data.statut !== 'resultats') {
        const classGLive = Object.values(map).map((j) => {
          const enJeu = !!pronosMap[j.id];
          return {
            ...j,
            gainsTotal: (j.gainsTotal || 0) + (enJeu ? gains[j.id] || 0 : 0),
            journeesJouees: (j.journeesJouees || 0) + 1, // Tous les joueurs comptent pour cette journée (présents ou absents)
          };
        });
        setClassG(
          applyDenseRank(
            classGLive.sort((a, b) => {
              const netA = (a.gainsTotal || 0) - (a.journeesJouees || 0) * 5;
              const netB = (b.gainsTotal || 0) - (b.journeesJouees || 0) * 5;
              return netB - netA;
            }),
            (j) => (j.gainsTotal || 0) - (j.journeesJouees || 0) * 5
          )
        );
      }
    };

    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'joueurs'));
        map = {};
        snap.docs.forEach((d, i) => {
          map[d.id] = { id: d.id, idx: i, ...d.data() };
        });
        setJoueursMap(map);
        setClassG(
          applyDenseRank(
            Object.values(map).sort((a, b) => {
              const netA = (a.gainsTotal || 0) - (a.journeesJouees || 0) * 5;
              const netB = (b.gainsTotal || 0) - (b.journeesJouees || 0) * 5;
              return netB - netA;
            }),
            (j) => (j.gainsTotal || 0) - (j.journeesJouees || 0) * 5
          )
        );

        const allJ = await getDocs(query(collection(db, 'journees'), orderBy('numero', 'asc')));
        const openJ = allJ.docs.find((d) => ['ouverte', 'fermee'].includes(d.data().statut));
        const jDoc = openJ || allJ.docs[allJ.docs.length - 1];
        if (jDoc) {
          // Listener journée (résultats, statut)
          unsubJournee = onSnapshot(
            doc(db, 'journees', jDoc.id),
            (d) => {
              try {
                if (!d.exists()) return;
                journeeData = d.data();
                setJournee({ id: d.id, ...journeeData });
                recalc();
              } catch (e) {
                console.error('Erreur traitement journée:', e);
                setError('Erreur lors du calcul du classement, recharge la page.');
              }
            },
            (e) => {
              console.error('Erreur listener journée:', e);
              setError('Connexion au classement perdue, recharge la page.');
            }
          );
          // Listener pronos (au cas où un joueur soumet/modifie après coup)
          unsubPronos = onSnapshot(
            collection(db, 'journees', jDoc.id, 'pronos'),
            (snap) => {
              try {
                pronosMap = {};
                snap.docs.forEach((d) => {
                  pronosMap[d.id] = d.data();
                });
                recalc();
              } catch (e) {
                console.error('Erreur traitement pronos:', e);
              }
            },
            (e) => console.error('Erreur listener pronos:', e)
          );
          // Listener missiles (dès qu'un missile est appliqué)
          unsubMissiles = onSnapshot(
            collection(db, 'journees', jDoc.id, 'missiles'),
            (snap) => {
              try {
                missiles = snap.docs.map((d) => d.data());
                recalc();
              } catch (e) {
                console.error('Erreur traitement missiles:', e);
              }
            },
            (e) => console.error('Erreur listener missiles:', e)
          );
        }
      } catch (e) {
        console.error('Erreur chargement classement:', e);
        setError('Impossible de charger le classement. Vérifie ta connexion et réessaie.');
      }
      setLoading(false);
    };
    load();
    return () => {
      if (unsubJournee) unsubJournee();
      if (unsubPronos) unsubPronos();
      if (unsubMissiles) unsubMissiles();
    };
  }, []);

  useEffect(() => {
    if (tab !== 'historique') return;
    setHistoriqueList([]);
    setLoadingHistorique(true);
    const loadHist = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'journees'), orderBy('numero', 'desc')));
        const hist = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((j) => j.statut === 'resultats' && j.pointsJoueurs);
        setHistoriqueList(hist);
        if (hist.length > 0) setSelectedHistJ(hist[0].id);
      } catch (e) {
        console.error('Erreur chargement historique:', e);
        setError("Impossible de charger l'historique. Réessaie.");
      }
      setLoadingHistorique(false);
    };
    loadHist();
  }, [tab]);

  const applyDenseRank = (arr, keyFn = (j) => `${j.gainJ}_${j.ptsJ}`) => {
    if (!arr.length) return arr;
    let rank = 1;
    return arr.map((j, i) => {
      if (i > 0 && keyFn(arr[i]) !== keyFn(arr[i - 1])) rank = i + 1;
      return { ...j, rank };
    });
  };

  const Rank = ({ rank }) => {
    if (rank === 1) return <span style={{ fontSize: 18 }}>🥇</span>;
    if (rank === 2) return <span style={{ fontSize: 18 }}>🥈</span>;
    if (rank === 3) return <span style={{ fontSize: 18 }}>🥉</span>;
    return (
      <span
        style={{
          fontSize: 13,
          fontWeight: 900,
          color: 'var(--tx3)',
          width: 24,
          textAlign: 'center',
          display: 'inline-block',
        }}
      >
        {rank}
      </span>
    );
  };

  const PlayerRow = ({ j, idx, pts, gain, net }) => {
    const [bg, color] = getC(idx);
    const isMe = j.id === profil?.id;
    const isLast = idx === (tab === 'journee' ? classJ : classG).length - 1;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: isMe
            ? 'rgba(155,226,45,.06)'
            : isLast
              ? 'rgba(248,113,113,.04)'
              : 'transparent',
          borderLeft: `3px solid ${isMe ? 'var(--g)' : 'transparent'}`,
          borderBottom: '1px solid rgba(155,226,45,.08)',
        }}
      >
        <Rank rank={j.rank} />
        <JerseyAvatar club={j.clubCoeur} initials={j.initiales} size={34} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: isMe ? 900 : 700,
              color: isMe ? 'var(--g)' : 'var(--tx)',
              textTransform: 'uppercase',
              letterSpacing: '.02em',
            }}
          >
            {j.nom?.split(' ')[0]} {isLast ? '💩' : ''}{' '}
            {isMe ? (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--tx3)',
                  fontWeight: 400,
                  textTransform: 'none',
                }}
              >
                (toi)
              </span>
            ) : (
              ''
            )}
          </div>
          {net !== undefined && false && (
            <div
              style={{
                fontSize: 11,
                color: net >= 0 ? 'var(--g)' : 'var(--r)',
                fontWeight: 900,
                marginTop: 1,
              }}
            >
              {net >= 0 ? '+' : ''}
              {net.toFixed(2)}€ net
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 9,
              color: 'var(--tx3)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.05em',
              marginBottom: 2,
            }}
          >
            Plus-value
          </div>
          <div
            style={{
              fontFamily: 'var(--D)',
              fontSize: 22,
              letterSpacing: '.03em',
              color: net >= 0 ? 'var(--g)' : 'var(--r)',
              lineHeight: 1,
              textShadow: isMe ? '0 0 10px rgba(155,226,45,.3)' : 'none',
            }}
          >
            {net >= 0 ? '+' : ''}
            {net.toFixed(2)}€
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='scroll-area'>
      <div
        style={{
          padding: '16px 20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div className='page-title'>Classement</div>
          <div className='page-sub'>Saison 26/27</div>
        </div>
        {journee &&
          ['ouverte', 'fermee'].includes(journee.statut) &&
          Object.values(journee.resultats || {}).some(
            (r) => r?.status === 'IN_PLAY' || r?.status === 'PAUSED'
          ) && (
            <div className='live'>
              <div className='live-dot'></div>
              Live
            </div>
          )}
      </div>

      {error && (
        <div className='alert alert-r' style={{ margin: '10px 16px 0' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          margin: '14px 16px 0',
          background: 'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))',
          border: '1px solid var(--bd)',
          borderRadius: 'var(--R)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(155,226,45,.1)',
            padding: '0 4px',
          }}
        >
          {[
            {
              id: 'journee',
              label: journee
                ? `⚡ J${journee.numero}${journee.statut === 'ouverte' || journee.statut === 'fermee' ? ' 🟢' : ''}`
                : '⚡ Journée',
            },
            { id: 'general', label: '🏆 Général' },
            { id: 'historique', label: '📅 Historique' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                background: 'none',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                color: tab === t.id ? 'var(--g)' : 'var(--tx3)',
                borderBottom: `2px solid ${tab === t.id ? 'var(--g)' : 'transparent'}`,
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(155,226,45,.08)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 700 }}>
            {tab === 'journee'
              ? `${journee?.statut === 'ouverte' ? '⏰ En cours' : journee?.statut === 'fermee' ? '🔒 Fermée' : '🏁 Finalisée'} · reset chaque journée`
              : journee && journee.statut !== 'resultats'
                ? '🔴 En direct · inclut la journée en cours (provisoire)'
                : 'Cumulatif depuis J1'}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className='spinner' style={{ width: 24, height: 24 }}></div>
          </div>
        ) : tab === 'journee' ? (
          classJ.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--tx3)',
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
              }}
            >
              Aucun prono soumis pour cette journée
            </div>
          ) : classJ.length === 0 ? (
            <div className='empty-state'>
              <div className='empty-state-icon'>⚡</div>
              <div className='empty-state-title'>Aucun prono soumis</div>
              <div className='empty-state-sub'>
                Les points apparaîtront dès que les matchs seront joués
              </div>
            </div>
          ) : (
            <table className='table' style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Joueur</th>
                  <th style={{ textAlign: 'right' }}>Pts</th>
                  <th style={{ textAlign: 'right' }}>Gain</th>
                </tr>
              </thead>
              <tbody>
                {classJ.map((j, i) => {
                  const [bg, color] = getC(i);
                  const isMe = j.id === profil?.id;
                  return (
                    <tr
                      key={j.id}
                      style={{ background: isMe ? 'rgba(155,226,45,.06)' : 'transparent' }}
                    >
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--D)',
                            fontSize: 20,
                            color:
                              j.rank === 1
                                ? '#FFD700'
                                : j.rank === 2
                                  ? '#C0C0C0'
                                  : j.rank === 3
                                    ? '#CD7F32'
                                    : 'var(--tx3)',
                          }}
                        >
                          {j.rank === 1 ? '🥇' : j.rank === 2 ? '🥈' : j.rank === 3 ? '🥉' : j.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <JerseyAvatar club={j.clubCoeur} initials={j.initiales} size={28} />
                          <span
                            style={{
                              fontWeight: isMe ? 900 : 700,
                              color: isMe ? 'var(--g)' : 'var(--tx)',
                              textTransform: 'uppercase',
                              fontSize: 12,
                            }}
                          >
                            {j.nom?.split(' ')[0]}{' '}
                            {isMe && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: 'var(--tx3)',
                                  fontWeight: 400,
                                  textTransform: 'none',
                                }}
                              >
                                (toi)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--D)',
                          fontSize: 22,
                          color: isMe ? 'var(--g)' : 'var(--tx)',
                        }}
                      >
                        {j.ptsJ}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: 'var(--g)',
                          fontWeight: 900,
                          fontSize: 12,
                        }}
                      >
                        {j.gainJ > 0 ? `+${j.gainJ.toFixed(2)}€` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : tab === 'historique' ? (
          <div style={{ padding: '10px 16px 16px' }}>
            {loadingHistorique ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className='spinner' style={{ width: 24, height: 24 }}></div>
              </div>
            ) : historiqueList.length === 0 ? (
              <div className='empty-state'>
                <div className='empty-state-icon'>📅</div>
                <div className='empty-state-title'>Aucune journée finalisée</div>
                <div className='empty-state-sub'>
                  L'historique apparaîtra ici après chaque journée
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {historiqueList.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setSelectedHistJ(j.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--Rs)',
                        fontSize: 12,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        cursor: 'pointer',
                        background:
                          selectedHistJ === j.id
                            ? 'linear-gradient(180deg, #B9F84F, #75B91D)'
                            : 'rgba(255,255,255,.05)',
                        color: selectedHistJ === j.id ? '#07100C' : 'var(--tx3)',
                        border: `1px solid ${selectedHistJ === j.id ? 'rgba(155,226,45,.4)' : 'var(--bd2)'}`,
                      }}
                    >
                      J{j.numero}
                    </button>
                  ))}
                </div>
                {(() => {
                  const j = historiqueList.find((j) => j.id === selectedHistJ);
                  if (!j) return null;
                  const sortedRaw = Object.entries(j.pointsJoueurs || {}).sort(
                    (a, b) => b[1] - a[1]
                  );
                  let rank = 1;
                  const sorted = sortedRaw.map(([uid, pts], i) => {
                    if (i > 0 && pts !== sortedRaw[i - 1][1]) rank = i + 1;
                    return [uid, pts, rank];
                  });
                  return (
                    <table className='table' style={{ fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>Joueur</th>
                          <th style={{ textAlign: 'right' }}>Pts J{j.numero}</th>
                          <th style={{ textAlign: 'right' }}>Gain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map(([uid, pts, rank], i) => {
                          const jj = joueursMap[uid];
                          const gain = j.gainsJoueurs?.[uid] || 0;
                          const isMe = uid === profil?.id;
                          const [bg, color] = getC(i);
                          return (
                            <tr
                              key={uid}
                              style={{ background: isMe ? 'rgba(155,226,45,.06)' : 'transparent' }}
                            >
                              <td>
                                <span
                                  style={{
                                    fontFamily: 'var(--D)',
                                    fontSize: 20,
                                    color:
                                      rank === 1
                                        ? '#FFD700'
                                        : rank === 2
                                          ? '#C0C0C0'
                                          : rank === 3
                                            ? '#CD7F32'
                                            : 'var(--tx3)',
                                  }}
                                >
                                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <JerseyAvatar
                                    club={jj?.clubCoeur}
                                    initials={jj?.initiales || '?'}
                                    size={28}
                                  />
                                  <span
                                    style={{
                                      fontWeight: isMe ? 900 : 700,
                                      color: isMe ? 'var(--g)' : 'var(--tx)',
                                      textTransform: 'uppercase',
                                      fontSize: 12,
                                    }}
                                  >
                                    {jj?.nom?.split(' ')[0] || uid}{' '}
                                    {isMe && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: 'var(--tx3)',
                                          fontWeight: 400,
                                          textTransform: 'none',
                                        }}
                                      >
                                        (toi)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontFamily: 'var(--D)',
                                  fontSize: 22,
                                  color: isMe ? 'var(--g)' : 'var(--tx)',
                                }}
                              >
                                {pts}
                              </td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  color: 'var(--g)',
                                  fontWeight: 900,
                                  fontSize: 12,
                                }}
                              >
                                {gain > 0 ? `+${gain.toFixed(2)}€` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </>
            )}
          </div>
        ) : classG.length === 0 ? (
          <div
            style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}
          >
            Aucun joueur enregistré
          </div>
        ) : (
          classG.map((j, i) => {
            const penalite = journee?.penalites?.[j.id] || 0;
            const net = Math.round(((j.gainsTotal || 0) - (j.journeesJouees || 0) * 5) * 100) / 100;
            return (
              <PlayerRow
                key={j.id}
                j={j}
                idx={i}
                pts={(j.pointsTotal || 0) + penalite}
                gain={j.gainsTotal || 0}
                net={net}
              />
            );
          })
        )}
      </div>

      {/* Barème */}
      <div
        style={{
          margin: '12px 16px 24px',
          padding: '12px 14px',
          background: 'linear-gradient(180deg, rgba(17,31,23,.94), rgba(8,15,11,.96))',
          border: '1px solid var(--bd)',
          borderRadius: 'var(--Rs)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 900,
            color: 'var(--tx3)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            marginBottom: 8,
          }}
        >
          💰 Barème gains / journée
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 12px',
            fontSize: 12,
            color: 'var(--tx2)',
            fontWeight: 700,
          }}
        >
          {[
            [1, 24],
            [2, 16],
            [3, 12],
            [4, 9],
            [5, 7],
            [6, 5],
            [7, 4],
            [8, 3],
          ].map(([r, g]) => (
            <span key={r}>
              {r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `${r}e`} →{' '}
              <span style={{ color: 'var(--g)' }}>{g}€</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
