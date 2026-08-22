import { describe, expect, it } from 'vitest'
import { coteEvenement, libelleMinuteEvenement } from './matchEvents'

describe('présentation bilatérale des événements', () => {
  it('reconnaît une appellation courte de l’équipe à domicile', () => {
    expect(coteEvenement('Marseille', 'Olympique de Marseille', 'RC Strasbourg Alsace'))
      .toBe('domicile')
  })

  it('reconnaît une appellation courte de l’équipe extérieure', () => {
    expect(coteEvenement('Strasbourg', 'Olympique de Marseille', 'RC Strasbourg Alsace'))
      .toBe('exterieur')
  })

  it('distingue le PSG de Paris FC', () => {
    expect(coteEvenement('Paris Saint-Germain', 'Paris SG', 'Paris FC'))
      .toBe('domicile')
  })

  it('formate le temps additionnel', () => {
    expect(libelleMinuteEvenement({ minute:90, injuryTime:4 })).toBe('90+4’')
  })
})
