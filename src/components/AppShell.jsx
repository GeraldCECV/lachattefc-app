import { memo, useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import Pronos from '../pages/Pronos';
import PronosChatteux from '../pages/PronosChatteux';
import Classement from '../pages/Classement';
import Bonus from '../pages/Bonus';
import Reglement from '../pages/Reglement';
import Profil from '../pages/Profil';

// Les pages déjà visitées restent montées pour permettre un retour immédiat.
// Sans mémoïsation, chaque clic dans la barre recalculait aussi toutes les
// pages masquées (notamment les centaines de lignes du Live), ce qui créait
// des saccades visibles sur ordinateur.
const ProfilMemo = memo(Profil);
const PronosMemo = memo(Pronos);
const PronosChatteuxMemo = memo(PronosChatteux);
const ClassementMemo = memo(Classement);
const BonusMemo = memo(Bonus);
const ReglementMemo = memo(Reglement);

function TabIcon({ name, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  const paths = {
    vestiaire: (
      <>
        <circle cx='12' cy='8' r='4' />
        <path d='M4 21v-1a8 8 0 0 1 16 0v1' />
      </>
    ),
    pronos: (
      <>
        <rect x='9' y='2' width='6' height='4' rx='1' />
        <path d='M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-3' />
        <path d='M9 12h6' />
        <path d='M9 16h4' />
      </>
    ),
    chatteux: (
      <>
        <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
        <circle cx='9' cy='7' r='4' />
        <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
        <path d='M16 3.13a4 4 0 0 1 0 7.75' />
      </>
    ),
    classement: (
      <>
        <polyline points='18 20 18 10' />
        <polyline points='12 20 12 4' />
        <polyline points='6 20 6 14' />
      </>
    ),
    bonus: (
      <>
        <path d='M20 12V22H4V12' />
        <path d='M22 7H2v5h20V7z' />
        <path d='M12 22V7' />
        <path d='M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z' />
        <path d='M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z' />
      </>
    ),
    reglement: (
      <>
        <path d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z' />
        <path d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' />
      </>
    ),
    live: (
      <>
        <rect x='3' y='6' width='18' height='12' rx='2' />
        <circle cx='12' cy='12' r='1.8' fill='currentColor' stroke='none' />
      </>
    ),
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const TABS = [
  { id: 'classement', ico: 'classement', lbl: 'Classement' },
  { id: 'pronos', ico: 'pronos', lbl: 'Fais tes pronos' },
  { id: 'chatteux', ico: 'live', lbl: 'Live' },
  { id: 'bonus', ico: 'bonus', lbl: 'Bonus' },
  { id: 'reglement', ico: 'reglement', lbl: 'Règles' },
  { id: 'vestiaire', ico: 'vestiaire', lbl: 'Profil' },
];

export default function AppShell() {
  const [tab, setTab] = useState('classement');
  const [ongletsVisites, setOngletsVisites] = useState(() => new Set(['classement']));
  const [actualisations, setActualisations] = useState({});
  const changerOnglet = (id) => {
    setOngletsVisites((precedents) => {
      if (precedents.has(id)) return precedents;
      const suivants = new Set(precedents);
      suivants.add(id);
      return suivants;
    });
    setActualisations((precedentes) => ({
      ...precedentes,
      [id]:(precedentes[id] || 0) + 1,
    }));
    setTab(id);
    // Vérifie en tâche de fond si une nouvelle version de l'app est dispo —
    // si oui, rechargement auto (via onNeedRefresh dans main.jsx)
    window.__checkForAppUpdate?.();
  };

  // Masque la barre du bas dès qu'un champ (input/select/textarea) prend
  // le focus n'importe où dans l'app — pas seulement dans un modal. Sur
  // iOS, le clavier natif (ou un sélecteur natif comme <select>) redimensionne
  // le viewport visuel, ce qui fait "sauter" la barre en position:fixed.
  // La solution robuste est de la masquer pendant la saisie plutôt que
  // d'essayer de la stabiliser pendant que ça bouge.
  //
  // Le retrait de `modal-open` est volontairement DIFFÉRÉ (300ms) plutôt
  // qu'immédiat au blur. Bug reproduit (Mathieu, Paris Annexe) : taper un
  // bouton d'action juste sous un champ texte déclenche le blur du champ
  // AVANT que le click du bouton ne se termine. Si on retire `modal-open`
  // immédiatement, la barre réapparaît et le clavier se ferme PENDANT le
  // tap — le viewport se redimensionne, le bouton bouge sous le doigt, et
  // le clic rate sa cible (aucune erreur, aucun appel réseau : le handler
  // ne se déclenche tout simplement jamais). En différant le retrait, le
  // layout reste stable le temps que le tap en cours se termine. Si un
  // nouveau champ reprend le focus avant l'expiration du délai (ex:
  // tabulation entre deux inputs), on annule le retrait — la barre ne
  // clignote pas.
  useEffect(() => {
    const CHAMPS = ['INPUT', 'SELECT', 'TEXTAREA'];
    let hideTimer = null;
    const onFocusIn = (e) => {
      if (!CHAMPS.includes(e.target.tagName)) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      document.body.classList.add('modal-open');
    };
    const onFocusOut = (e) => {
      if (!CHAMPS.includes(e.target.tagName)) return;
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        document.body.classList.remove('modal-open');
        hideTimer = null;
      }, 300);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const pages = {
    vestiaire: <ProfilMemo refreshKey={actualisations.vestiaire || 0} />,
    pronos: <PronosMemo refreshKey={actualisations.pronos || 0} />,
    chatteux: <PronosChatteuxMemo active={tab === 'chatteux'} />,
    classement: <ClassementMemo active={tab === 'classement'} />,
    bonus: <BonusMemo refreshKey={actualisations.bonus || 0} />,
    reglement: <ReglementMemo />,
  };

  return (
    <>
      <div className='app-shell'>
      <div className='screen-content'>
        {TABS.filter(({ id }) => ongletsVisites.has(id)).map(({ id }) => (
          <div key={id} hidden={tab !== id} aria-hidden={tab !== id} style={{ display:tab === id ? 'block' : 'none' }}>
            <ErrorBoundary>{pages[id]}</ErrorBoundary>
          </div>
        ))}
      </div>

      <div className='tab-bar'>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-item ${tab === t.id ? 'on' : ''}`}
            onClick={() => changerOnglet(t.id)}
          >
            <span className='tab-ico'>
              <TabIcon name={t.ico} size={20} />
            </span>
            <span className='tab-lbl'>{t.lbl}</span>
          </button>
        ))}
      </div>
      </div>
    </>
  );
}
