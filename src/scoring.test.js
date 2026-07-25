import { describe, it, expect } from 'vitest'
import {
  POINTS,
  issueMatch,
  calcPoints1N2,
  calcPointsScorer,
  isJackpotOn,
  getDcChoicesFor,
  joueurADevineIssue,
} from './scoring.js'

// ════════════════════════════════════════════════
// Ces tests décrivent le règlement, pas l'inverse.
//
// Rappel des règles couvertes :
//  · bon résultat 1N2 = 1pt
//  · bonus surprise : si ≤25% des joueurs ont trouvé → 2pts au lieu de 1
//  · jackpot : double les points du match (interdit sur le scorer)
//  · scorer : score exact 3pts / bon écart 2pts / bonne issue 1pt
//    (2pts si l'issue est une surprise), plafonné à 3pts
// ════════════════════════════════════════════════

describe('issueMatch', () => {
  it('victoire domicile → "1"', () => expect(issueMatch(2, 1)).toBe('1'))
  it('match nul → "N"', () => expect(issueMatch(1, 1)).toBe('N'))
  it('victoire extérieur → "2"', () => expect(issueMatch(1, 2)).toBe('2'))
  it('score large → issue correcte', () => expect(issueMatch(5, 0)).toBe('1'))
})

describe('calcPoints1N2 — bon résultat', () => {
  it('prono faux → 0pt', () => {
    expect(calcPoints1N2({}, 'N', '1', 5, 10, 'l1_0')).toBe(0)
  })

  it('prono juste trouvé par la majorité (50%) → 1pt', () => {
    expect(calcPoints1N2({}, '1', '1', 5, 10, 'l1_0')).toBe(POINTS.bonResult)
  })

  it('prono juste trouvé par tous (100%) → 1pt', () => {
    expect(calcPoints1N2({}, '1', '1', 16, 16, 'l1_0')).toBe(1)
  })
})

describe('calcPoints1N2 — bonus surprise (≤25%)', () => {
  it('1 joueur sur 16 (6%) → 2pts', () => {
    expect(calcPoints1N2({}, '2', '2', 1, 16, 'l1_3')).toBe(POINTS.bonResultSurprise)
  })

  it('seuil exact 25% (4/16) → 2pts, le seuil est inclusif', () => {
    expect(calcPoints1N2({}, '2', '2', 4, 16, 'l1_3')).toBe(2)
  })

  it('juste au-dessus du seuil (5/16 = 31%) → 1pt', () => {
    expect(calcPoints1N2({}, '2', '2', 5, 16, 'l1_3')).toBe(1)
  })

  it('totalJoueurs = 0 → pas de division par zéro, 1pt', () => {
    expect(calcPoints1N2({}, '1', '1', 0, 0, 'l1_0')).toBe(1)
  })
})

describe('calcPoints1N2 — jackpot', () => {
  const avecJackpot = { jackpotMatches: ['l1_2'] }

  it('jackpot sur un résultat normal → 1pt × 2 = 2pts', () => {
    expect(calcPoints1N2(avecJackpot, '1', '1', 8, 16, 'l1_2')).toBe(2)
  })

  it('jackpot cumulé au bonus surprise → 2pts × 2 = 4pts', () => {
    expect(calcPoints1N2(avecJackpot, '1', '1', 1, 16, 'l1_2')).toBe(4)
  })

  it('jackpot sur un AUTRE match → pas de doublement', () => {
    expect(calcPoints1N2(avecJackpot, '1', '1', 8, 16, 'l1_5')).toBe(1)
  })

  it('jackpot ne rattrape pas un prono faux → 0pt', () => {
    expect(calcPoints1N2(avecJackpot, 'N', '1', 8, 16, 'l1_2')).toBe(0)
  })

  it('ancien format à champ unique reste supporté', () => {
    expect(calcPoints1N2({ jackpotMatch: 'l1_2' }, '1', '1', 8, 16, 'l1_2')).toBe(2)
  })
})

describe('isJackpotOn — interdit sur le match à scorer', () => {
  it('jackpot actif sur un match L1', () => {
    expect(isJackpotOn({ jackpotMatches: ['l1_1'] }, 'l1_1')).toBe(true)
  })

  it('jackpot ignoré sur le scorer, même si mal renseigné', () => {
    expect(isJackpotOn({ jackpotMatches: ['scorer'] }, 'scorer')).toBe(false)
  })

  it('aucun bonus posé → false', () => {
    expect(isJackpotOn({}, 'l1_0')).toBe(false)
  })
})

describe('calcPointsScorer', () => {
  it('score exact → 3pts', () => {
    expect(calcPointsScorer('2-1', 2, 1, 8, 16)).toBe(POINTS.scorerExact)
  })

  it('bon écart et bonne issue (2-1 pour 3-2) → 2pts', () => {
    expect(calcPointsScorer('2-1', 3, 2, 8, 16)).toBe(POINTS.scorerBonEcart)
  })

  it('bonne issue seule, trouvée par la majorité → 1pt', () => {
    expect(calcPointsScorer('2-1', 3, 0, 8, 16)).toBe(POINTS.scorerBonneIssue)
  })

  it('bonne issue seule mais surprise (≤25%) → 2pts', () => {
    expect(calcPointsScorer('2-1', 3, 0, 2, 16)).toBe(2)
  })

  it('mauvaise issue → 0pt', () => {
    expect(calcPointsScorer('2-1', 1, 1, 8, 16)).toBe(0)
  })

  it('nul pronostiqué, nul réalisé sur un autre score → 2pts (bon écart)', () => {
    expect(calcPointsScorer('1-1', 2, 2, 8, 16)).toBe(2)
  })

  it('ne dépasse jamais le plafond de 3pts', () => {
    const max = Math.max(
      calcPointsScorer('2-1', 2, 1, 1, 16),
      calcPointsScorer('2-1', 3, 2, 1, 16),
      calcPointsScorer('2-1', 5, 0, 1, 16)
    )
    expect(max).toBeLessThanOrEqual(POINTS.scorerMax)
  })
})

describe('calcPointsScorer — entrées invalides', () => {
  it('prono vide → 0pt', () => expect(calcPointsScorer('', 2, 1, 8, 16)).toBe(0))
  it('prono null → 0pt', () => expect(calcPointsScorer(null, 2, 1, 8, 16)).toBe(0))
  it('prono non numérique → 0pt', () => expect(calcPointsScorer('a-b', 2, 1, 8, 16)).toBe(0))
  it('prono mal formé → 0pt', () => expect(calcPointsScorer('21', 2, 1, 8, 16)).toBe(0))
})

describe('Double Chance', () => {
  const avecDc = { dcSelections: [{ matchKey: 'l1_4', choices: ['1', 'N'] }] }

  it('les 2 choix sont bien lus', () => {
    expect(getDcChoicesFor(avecDc, 'l1_4')).toEqual(['1', 'N'])
  })

  it('DC jamais actif sur le match à scorer', () => {
    expect(getDcChoicesFor({ dcSelections: [{ matchKey: 'scorer', choices: ['1', 'N'] }] }, 'scorer')).toBe(null)
  })

  it('un seul choix renseigné → DC invalide', () => {
    expect(getDcChoicesFor({ dcSelections: [{ matchKey: 'l1_4', choices: ['1'] }] }, 'l1_4')).toBe(null)
  })
})

describe('joueurADevineIssue — comptage du ratio surprise', () => {
  it('joueur normal : prono égal au résultat', () => {
    expect(joueurADevineIssue({ matchesL1: ['1', 'N'] }, 'l1_0', '1')).toBe(true)
  })

  it('joueur normal : prono différent du résultat', () => {
    expect(joueurADevineIssue({ matchesL1: ['1', 'N'] }, 'l1_0', '2')).toBe(false)
  })

  it('joueur en DC : compté juste via son 2e choix', () => {
    const p = { matchesL1: ['1'], dcSelections: [{ matchKey: 'l1_0', choices: ['1', 'N'] }] }
    expect(joueurADevineIssue(p, 'l1_0', 'N')).toBe(true)
  })

  it('joueur en DC : résultat absent de ses 2 choix', () => {
    const p = { matchesL1: ['1'], dcSelections: [{ matchKey: 'l1_0', choices: ['1', 'N'] }] }
    expect(joueurADevineIssue(p, 'l1_0', '2')).toBe(false)
  })

  it("fonctionne aussi sur l'affiche européenne", () => {
    expect(joueurADevineIssue({ matchEuro: '2' }, 'euro', '2')).toBe(true)
  })

  it('prono manquant (absent) → false', () => {
    expect(joueurADevineIssue({}, 'l1_0', '1')).toBe(false)
  })
})
