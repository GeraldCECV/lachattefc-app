import { useEffect, useMemo, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useUser } from '../App';
import TeamLogo from '../components/TeamLogo';
import { MISES_PARIS_ANNEXE } from '../firebase/constants';
import { clubKey, clubLabel } from '../utils/clubName';

const CATEGORIES = [
  { key: 'podium', icon: '🏆', label: 'Podium L1' },
  { key: 'buteur', icon: '⚽', label: 'Meilleur buteur' },
  { key: 'passeur', icon: '👟', label: 'Meilleur passeur' },
  { key: 'ldc', icon: '🌟', label: 'Vainqueur LDC' },
  { key: 'europa', icon: '🏅', label: 'Vainqueur Europa' },
];

const normaliser = (valeur) => String(valeur || '').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const initiales = (nom) => String(nom || '?').split(/\s+/).filter(Boolean).map(mot => mot[0]).join('').slice(0, 2).toUpperCase();

function Club({ name, compact = false }) {
  if (!name) return <span style={{ color: 'var(--tx3)' }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <TeamLogo name={clubKey(name)} size={compact ? 18 : 24} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{clubLabel(name)}</span>
    </span>
  );
}

function Choix({ category, prono, compact = false }) {
  if (!prono) return <span style={{ color: 'var(--r)', fontWeight: 900 }}>ABS</span>;
  if (category === 'podium') {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: compact ? 3 : 7 }}>
        {(prono.podium || []).map((club, index) => (
          <span key={`${club}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>{['🥇', '🥈', '🥉'][index]}</span><Club name={club} compact />
          </span>
        ))}
      </span>
    );
  }
  if (category === 'ldc' || category === 'europa') return <Club name={prono[category]} compact={compact} />;
  return <span>{prono[category] || '—'}</span>;
}

export default function ParisAnnexes({ onBack }) {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('podium');
  const [overview, setOverview] = useState(false);

  const charger = async () => {
    setLoading(true);
    setError('');
    const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'consulterParisAnnexe');
    let derniereErreur = null;
    for (const delai of [0, 700, 1600]) {
      if (delai) await new Promise(resolve => setTimeout(resolve, delai));
      try {
        const result = await fn();
        setData(result.data);
        setLoading(false);
        return;
      } catch (e) {
        derniereErreur = e;
      }
    }
    console.error('Erreur chargement Paris annexes:', derniereErreur);
    setError('Impossible de charger les paris annexes. Vérifie ta connexion et réessaie.');
    setLoading(false);
  };

  useEffect(() => { charger(); }, []);

  const participants = data?.nombreParticipants || 0;
  const pots = useMemo(() => Object.fromEntries(
    Object.entries(MISES_PARIS_ANNEXE).map(([key, mise]) => [key, mise * participants])
  ), [participants]);
  const estGagnant = (prono, key) => {
    if (!prono || !data?.resultats) return false;
    if (key === 'podium') return Array.isArray(prono.podium) && Array.isArray(data.resultats.podium) && prono.podium.every((club, index) => clubKey(club) === clubKey(data.resultats.podium[index]));
    if (key === 'ldc' || key === 'europa') return clubKey(prono[key]) === clubKey(data.resultats[key]);
    return normaliser(prono[key]) === normaliser(data.resultats[key]);
  };

  if (loading) return (
    <div className="scroll-area">
      <div style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-secondary" onClick={onBack}>‹</button>
        <div className="page-title">Pronostics annexes</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
    </div>
  );

  return (
    <div className="scroll-area">
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onBack} aria-label="Retour">‹</button>
          <div style={{ flex: 1 }}>
            <div className="page-title">Pronostics annexes</div>
            <div className="page-sub">Saison 26/27 · {data ? `${participants} / ${data.nombreJoueurs || 0} joueurs` : '— joueurs'}</div>
          </div>
          <div style={{ border: '1px solid var(--a-b)', color: 'var(--a)', borderRadius: 14, padding: '8px 10px', fontWeight: 900, fontSize: 12 }}>
            Mise : 6€
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-r" style={{ margin: 16 }}>{error}<button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={charger}>Réessayer</button></div>
      ) : !data?.pronosVisibles ? (
        <div style={{ margin: '14px 16px' }} className="card">
          <div style={{ fontWeight: 900, color: 'var(--g)', marginBottom: 10 }}>🔒 Pronostics encore secrets</div>
          <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 14 }}>
            Les choix des autres joueurs seront dévoilés après la deadline.
            {data?.deadlineMs && <><br />Deadline : {new Date(data.deadlineMs).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })}</>}
          </div>
          {data?.monProno ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CATEGORIES.map(cat => (
                <div key={cat.key} style={{ paddingTop: 10, borderTop: '1px solid var(--bd)' }}>
                  <div style={{ color: 'var(--tx3)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>{cat.icon} {cat.label}</div>
                  <Choix category={cat.key} prono={data.monProno} />
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--r)', fontWeight: 800 }}>Aucun pronostic enregistré.</div>}
        </div>
      ) : (
        <>
          <div style={{ margin: '10px 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className={`btn ${!overview ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOverview(false)}>☰ Par catégorie</button>
            <button className={`btn ${overview ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOverview(true)}>▦ Vue d’ensemble</button>
          </div>

          {!overview && (
            <>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px', scrollbarWidth: 'none' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.key} className={`btn ${category === cat.key ? 'btn-primary' : 'btn-secondary'}`} style={{ flexShrink: 0 }} onClick={() => setCategory(cat.key)}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
              <div style={{ margin: '0 16px 24px', border: '1px solid var(--p-b)', borderRadius: 'var(--R)', overflow: 'hidden', background: 'rgba(15,25,19,.96)' }}>
                <div style={{ padding: 14, background: 'linear-gradient(90deg, rgba(112,56,255,.18), rgba(235,0,167,.12))', borderBottom: '1px solid var(--p-b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{CATEGORIES.find(cat => cat.key === category)?.icon} {CATEGORIES.find(cat => cat.key === category)?.label}</strong>
                  <span style={{ color: 'var(--g)', fontWeight: 900, fontSize: 12 }}>Pot : {pots[category]}€</span>
                </div>
                {(data.joueurs || []).map((joueur) => {
                  const winner = data.statut === 'resultats' && estGagnant(joueur.prono, category);
                  return (
                    <div key={joueur.uid} style={{ display: 'grid', gridTemplateColumns: '34px minmax(95px,.8fr) minmax(0,1.4fr)', gap: 8, alignItems: 'center', padding: '11px 12px', borderBottom: '1px solid var(--bd)', background: joueur.uid === user?.uid ? 'rgba(155,226,45,.06)' : winner ? 'rgba(33,194,111,.08)' : 'transparent' }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bd)', color: 'var(--tx2)', fontWeight: 900, fontSize: 10 }}>{initiales(joueur.nom)}</span>
                      <strong style={{ color: joueur.uid === user?.uid ? 'var(--g)' : 'var(--tx)' }}>{joueur.nom}</strong>
                      <div style={{ minWidth: 0, fontSize: 12 }}><Choix category={category} prono={joueur.prono} /></div>
                      {data.statut === 'resultats' && winner && <span style={{ gridColumn: '3', color: 'var(--g)', fontWeight: 900, fontSize: 11 }}>✓ Bon pronostic</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {overview && (
            <div style={{ margin: '0 16px 24px', overflowX: 'auto', border: '1px solid var(--p-b)', borderRadius: 'var(--R)', background: 'rgba(15,25,19,.96)' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 980, width: '100%', fontSize: 11 }}>
                <thead><tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#122019', textAlign: 'left', padding: 12, minWidth: 150 }}>Joueur</th>
                  {CATEGORIES.map(cat => <th key={cat.key} style={{ padding: 12, minWidth: cat.key === 'podium' ? 210 : 145, borderLeft: '1px solid var(--bd)' }}>{cat.icon}<br />{cat.label}<div style={{ color: 'var(--g)', marginTop: 4 }}>Pot {pots[cat.key]}€</div></th>)}
                </tr></thead>
                <tbody>{(data.joueurs || []).map(joueur => (
                  <tr key={joueur.uid} style={{ background: joueur.uid === user?.uid ? 'rgba(155,226,45,.06)' : 'transparent' }}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 1, background: joueur.uid === user?.uid ? '#192b18' : '#101c16', padding: 12, borderTop: '1px solid var(--bd)', fontWeight: 900, color: joueur.uid === user?.uid ? 'var(--g)' : 'var(--tx)' }}>{joueur.nom}</td>
                    {CATEGORIES.map(cat => <td key={cat.key} style={{ padding: 12, borderTop: '1px solid var(--bd)', borderLeft: '1px solid var(--bd)', verticalAlign: 'top', background: data.statut === 'resultats' && estGagnant(joueur.prono, cat.key) ? 'rgba(33,194,111,.12)' : 'transparent' }}><Choix category={cat.key} prono={joueur.prono} compact /></td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
