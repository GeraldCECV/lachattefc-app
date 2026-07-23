import { describe, it, expect } from 'vitest'
import {
  issueMatch,
  calcPoints1N2,
  calcPointsScorer,
  isJackpotOn,
  joueurADevineIssue,
} from './scoring.js'

describe('Scoring Logic — Core Functions', () => {
  describe('issueMatch', () => {
    it('should return "1" for home win', () => {
      expect(issueMatch(2, 1)).toBe('1')
    })
    it('should return "N" for draw', () => {
      expect(issueMatch(1, 1)).toBe('N')
    })
    it('should return "2" for away win', () => {
      expect(issueMatch(1, 2)).toBe('2')
    })
  })

  describe('calcPoints1N2', () => {
    it('should return 1 for correct 1', () => {
      const points = calcPoints1N2('1', '1', '1', 1, 10, 'l1_0')
      expect(points).toBe(1)
    })
    it('should return 0 for wrong prediction', () => {
      const points = calcPoints1N2('1', 'N', '1', 1, 10, 'l1_0')
      expect(points).toBe(0)
    })
  })

  describe('calcPointsScorer', () => {
    it('should return 3 for exact score', () => {
      const points = calcPointsScorer('2-1', 2, 1, 1, 10)
      expect(points).toBe(3)
    })
    it('should return 0 for wrong score', () => {
      const points = calcPointsScorer('2-1', 1, 1, 1, 10)
      expect(points).toBe(0)
    })
  })
})
