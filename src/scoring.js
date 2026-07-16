// ════════════════════════════════════════════════
// Module de calcul des points — La Chatte FC
//
// COPIE de lachattefc-functions/scoring.js, adaptée en export ESM (au lieu
// de module.exports/CommonJS) pour être importable côté client Vite.
//
// IMPORTANT : les corps de fonctions ci-dessous doivent rester STRICTEMENT
// identiques à la version des Cloud Functions — seule la syntaxe d'export
// en bas de fichier diffère entre les deux repos (CommonJS côté functions,
// ESM ici). En cas de correction du calcul des points côté serveur, reporter
// le même changement ici pour que l'affichage live (app) ne diverge pas du
// calcul officiel. Un `diff` entre les deux fichiers (en ignorant les 10
// dernières lignes d'export) doit toujours être vide.
// ════════════════════════════════════════════════

const POINTS = {
  bonResult: 1,
  bonResultSurprise: 2,
  scorerExact: 3,
  scorerBonEcart: 2,
  scorerBonneIssue: 1,
  seuilSurprise: 0.25,
  scorerMax: 3,
};

// Détermine l'issue 1N2 d'un score
function issueMatch(h, a) {
  if (h > a) return '1';
  if (h < a) return '2';
  return 'N';
}

// Points sur un match "scorer" (score exact demandé). bonCount/totalJoueurs
// sont optionnels : s'ils sont fournis, le palier "bonne issue seulement"
// passe de 1 à 2pts si ≤25% des joueurs ont trouvé la bonne issue (bonus
// surprise, même principe que sur les matchs 1N2 classiques). Sans ces
// paramètres, comportement inchangé (1pt fixe).
function calcPointsScorer(prono, scoreH, scoreA, bonCount, totalJoueurs) {
  if (!prono || typeof prono !== 'string') return 0;
  const parts = prono.split('-');
  const pH = parseInt(parts[0]);
  const pA = parseInt(parts[1]);
  if (isNaN(pH) || isNaN(pA)) return 0;

  if (pH === scoreH && pA === scoreA) return POINTS.scorerExact;

  const bonEcart = (pH - pA) === (scoreH - scoreA);
  const bonIssue = issueMatch(pH, pA) === issueMatch(scoreH, scoreA);

  if (bonEcart && bonIssue) return POINTS.scorerBonEcart;
  if (bonIssue) {
    if (totalJoueurs > 0 && bonCount / totalJoueurs <= POINTS.seuilSurprise) {
      return POINTS.scorerBonEcart; // bonus surprise = 2pts (même valeur que "bon écart")
    }
    return POINTS.scorerBonneIssue;
  }
  return 0;
}

// ── Helpers jackpot/DC multi-instances, rétro-compatibles avec l'ancien
// format à champ unique (pronos soumis avant le passage au multi-jackpot/
// multi-DC) ──
function getJackpotMatches(p) {
  if (Array.isArray(p?.jackpotMatches)) return p.jackpotMatches;
  return p?.jackpotMatch ? [p.jackpotMatch] : [];
}
function getDcSelections(p) {
  if (Array.isArray(p?.dcSelections)) return p.dcSelections;
  return p?.dcMatch ? [{ matchKey: p.dcMatch, choices: p.dcChoices || [] }] : [];
}
function isJackpotOn(p, matchKey) {
  return matchKey !== 'scorer' && getJackpotMatches(p).includes(matchKey);
}
function getDcChoicesFor(p, matchKey) {
  if (matchKey === 'scorer') return null;
  const sel = getDcSelections(p).find(d => d.matchKey === matchKey);
  return sel?.choices?.length === 2 ? sel.choices : null;
}

// Détermine si un joueur a deviné la bonne issue sur un match, en tenant
// compte de la Double Chance (2 choix possibles) — utilisé pour le calcul
// du ratio du bonus surprise (bonCount/totalJoueurs), pour que les joueurs
// en DC soient comptés correctement s'ils ont deviné via l'un de leurs 2
// choix, plutôt que via la seule valeur brute stockée dans matchesL1.
function joueurADevineIssue(p, key, result) {
  const dc = getDcChoicesFor(p, key);
  if (dc) return dc.includes(result);
  if (key.startsWith('l1_')) return p?.matchesL1?.[parseInt(key.replace('l1_', ''))] === result;
  if (key === 'euro') return p?.matchEuro === result;
  return false;
}

// Points sur un match 1N2 classique, avec bonus surprise et doublement
// jackpot. Fonction pure : ne dépend que de ses paramètres.
function calcPoints1N2(pronoData, prono, result, bonCount, totalJoueurs, matchKey) {
  if (prono !== result) return 0;
  const ratio = totalJoueurs > 0 ? bonCount / totalJoueurs : 1;
  let pts = ratio <= POINTS.seuilSurprise ? POINTS.bonResultSurprise : POINTS.bonResult;
  if (isJackpotOn(pronoData, matchKey)) {
    pts *= 2;
  }
  return pts;
}

export {
  POINTS,
  issueMatch,
  calcPointsScorer,
  getJackpotMatches,
  getDcSelections,
  isJackpotOn,
  getDcChoicesFor,
  joueurADevineIssue,
  calcPoints1N2,
};
