import { describe, expect, it } from 'vitest';
import { matchsChronologiques } from './pronoMatchOrder';

describe('ordre chronologique des pronostics', () => {
  it('mélange correctement dates API et horaires affichés', () => {
    const matchs = [
      { dom: 'C', jour: 'Dimanche', heure: '20:45', utcDate: '2026-11-01T19:45:00Z' },
      { dom: 'A', jour: 'Vendredi', heure: '20:45' },
      { dom: 'B', jour: 'Samedi', heure: '17:00', utcDate: '2026-10-31T16:00:00Z' },
    ];

    expect(matchsChronologiques(matchs).map(({ match }) => match.dom)).toEqual(['A', 'B', 'C']);
  });

  it('conserve les index Firebase après le tri', () => {
    const matchs = [
      { dom: 'Dimanche', jour: 'Dimanche', heure: '15:00' },
      { dom: 'Samedi', jour: 'Samedi', heure: '21:05' },
    ];

    expect(matchsChronologiques(matchs).map(({ index }) => index)).toEqual([1, 0]);
  });

  it('convertit une date UTC en heure de Paris si jour et heure manquent', () => {
    const matchs = [
      { dom: 'Dimanche', utcDate: '2026-11-01T14:00:00Z' },
      { dom: 'Samedi', jour: 'Samedi', heure: '21:05' },
    ];

    expect(matchsChronologiques(matchs).map(({ match }) => match.dom)).toEqual(['Samedi', 'Dimanche']);
  });
});

