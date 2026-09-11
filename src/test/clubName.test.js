import { describe, expect, it } from 'vitest';
import { clubKey, clubLabel } from '../utils/clubName';

describe('mapping des clubs des Paris annexes', () => {
  it.each([
    ['Réal Madrid', 'Real madrid'],
    ['Barcelone', 'FC Barcelona'],
    ['Fc Barcelone', 'Barcelona'],
    ['Bayern', 'Bayern München'],
    ['PSG', 'Paris Saint-Germain'],
    ['Paris', 'PSG'],
    ['Arsenal FC', 'ARSENAL'],
  ])('rapproche %s et %s', (a, b) => {
    expect(clubKey(a)).toBe(clubKey(b));
  });

  it('affiche une écriture uniforme', () => {
    expect(clubLabel('réal madrid')).toBe('Real Madrid');
    expect(clubLabel('FC Barcelona')).toBe('FC Barcelone');
    expect(clubLabel('Bayern München')).toBe('Bayern Munich');
  });
});
