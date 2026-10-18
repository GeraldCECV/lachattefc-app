import { describe, expect, it } from 'vitest';
import { translateTeam } from '../utils/teamName';

describe('normalisation des noms d’équipes', () => {
  it.each(['Atleti', 'Atletico', 'Atletico Madrid', 'Atlético de Madrid', 'Club Atlético de Madrid', 'Atl. Madrid'])(
    'affiche %s sous le nom canonique',
    alias => {
      expect(translateTeam(alias)).toBe('Atlético Madrid');
    }
  );
});
