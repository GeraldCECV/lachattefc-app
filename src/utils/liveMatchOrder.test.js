import { describe, expect, it } from 'vitest'
import { LIVE_ORDER, trierMatchsLive } from './liveMatchOrder'

const match = (key, utcDate, ordreInitial) => ({ key, utcDate, ordreInitial })
const matchs = [
  match('vendredi', '2026-08-21T18:45:00Z', 0),
  match('samedi', '2026-08-22T15:15:00Z', 1),
  match('dimanche', '2026-08-23T18:45:00Z', 2),
]
const resultats = { vendredi: { status: 'FINISHED' } }

describe('tri des matchs du Live', () => {
  it('conserve tous les matchs dans l’ordre chronologique', () => {
    expect(trierMatchsLive(matchs, resultats, LIVE_ORDER.CHRONOLOGIQUE).map(m => m.key))
      .toEqual(['vendredi', 'samedi', 'dimanche'])
  })

  it('place les matchs terminés après les matchs restant à jouer', () => {
    expect(trierMatchsLive(matchs, resultats, LIVE_ORDER.A_JOUER).map(m => m.key))
      .toEqual(['samedi', 'dimanche', 'vendredi'])
  })
})
