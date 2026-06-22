import { db, auth } from './config.js';
import { doc, setDoc, collection, writeBatch } from 'firebase/firestore';

// Les 14 joueurs extraits du code de Baptiste
export const JOUEURS = [
  { id: 'kmel',   nom: 'Kamel Menlaikhaf',   initiales: 'KM', role: 'admin' },
  { id: 'sim',    nom: 'Simon Galloyer',      initiales: 'SG', role: 'joueur' },
  { id: 'mat',    nom: 'Mathieu Plet',        initiales: 'MP', role: 'admin' },
  { id: 'tibo',   nom: 'Thibaut Plet',        initiales: 'TP', role: 'joueur' },
  { id: 'jo',     nom: 'Jonathan',            initiales: 'JO', role: 'joueur' },
  { id: 'batist', nom: 'Baptiste Claire',     initiales: 'BC', role: 'admin' },
  { id: 'krim',   nom: 'Karim',               initiales: 'KR', role: 'joueur' },
  { id: 'raf',    nom: 'Rafael Sortais',      initiales: 'RS', role: 'joueur' },
  { id: 'jerem',  nom: 'Jérémie Galloyer',    initiales: 'JG', role: 'joueur' },
  { id: 'juz',    nom: 'Juz',                 initiales: 'JZ', role: 'joueur' },
  { id: 'max',    nom: 'Maxence',             initiales: 'MX', role: 'joueur' },
  { id: 'gerald', nom: 'Gérald',              initiales: 'GE', role: 'admin' },
  { id: 'nico',   nom: 'Nicolas',             initiales: 'NC', role: 'joueur' },
  { id: 'thomas',  nom: 'Thomas',              initiales: 'TH', role: 'joueur' },
  { id: 'michael', nom: 'Michael Daigneau',    initiales: 'MD', role: 'joueur' },
  { id: 'vincent', nom: 'Vincent Fouqueray',   initiales: 'VF', role: 'joueur' },
];

// Bonus de départ par saison (selon le règlement)
export const BONUS_DEPART = {
  missile: 5,
  jackpot: 3,
  doubleChance: 4,
};

// Barème des gains par journée (règlement Article 8) — 16 joueurs, pot 80€
export const GAINS_JOURNEE = {
  1: 24, 2: 18, 3: 14, 4: 11, 5: 8, 6: 5
};
export const GAIN_TOTAL_J = 80;

// Règles de points
export const POINTS = {
  // Match 1N2 normal
  bonResult: 1,
  bonResultSurprise: 2, // ≤25% des joueurs
  // Match scorer
  scorerExact: 3,
  scorerBonEcart: 2,
  scorerBonneIssue: 1,
  scorerSurprise: 2, // ≤25% bonne issue
  scorerMax: 3,
  // Pénalité absence
  absencePenalite: -1,
  // Seuil surprise
  seuilSurprise: 0.25,
};
