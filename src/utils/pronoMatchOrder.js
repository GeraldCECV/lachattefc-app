const ORDRE_JOURS = {
  lundi: 0,
  mardi: 1,
  mercredi: 2,
  jeudi: 3,
  vendredi: 4,
  samedi: 5,
  dimanche: 6,
};

const normaliser = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

function minuteDansLaSemaine(jour, heure) {
  const jourNormalise = normaliser(jour);
  const indexJour = Object.entries(ORDRE_JOURS)
    .find(([nom]) => jourNormalise.includes(nom))?.[1];
  const morceauxHeure = String(heure || '').match(/(\d{1,2})\s*[:h]\s*(\d{2})/i);

  if (indexJour === undefined || !morceauxHeure) return null;
  return indexJour * 24 * 60 + Number(morceauxHeure[1]) * 60 + Number(morceauxHeure[2]);
}

function dateUtcEnHeureDeParis(value) {
  const milliseconds = typeof value?.toMillis === 'function'
    ? value.toMillis()
    : value?.seconds
      ? value.seconds * 1000
      : Date.parse(value || '');

  if (!Number.isFinite(milliseconds)) return null;

  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(milliseconds));
  const lire = type => parts.find(part => part.type === type)?.value;
  return minuteDansLaSemaine(lire('weekday'), `${lire('hour')}:${lire('minute')}`);
}

export function ordreChronologiqueProno(match, index = 0) {
  // `jour` et `heure` correspondent à ce qui est affiché au joueur et sont
  // toujours exprimés en heure de Paris. Ils restent donc la source prioritaire.
  const horaireAffiche = minuteDansLaSemaine(match?.jour, match?.heure);
  if (horaireAffiche !== null) return horaireAffiche;

  const horaireApi = dateUtcEnHeureDeParis(match?.utcDate);
  if (horaireApi !== null) return horaireApi;

  // Un match incomplet reste stable en fin de liste.
  return Number.MAX_SAFE_INTEGER - 1000 + index;
}

// Trie uniquement l'affichage. L'index Firebase original est conservé afin que
// chaque choix reste associé au bon match après réordonnancement.
export function matchsChronologiques(matches = []) {
  return matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) =>
      ordreChronologiqueProno(a.match, a.index)
      - ordreChronologiqueProno(b.match, b.index)
      || a.index - b.index
    );
}

