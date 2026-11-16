import { describe, expect, it } from 'vitest'
import { attributes, levelFromXp, rankOf, totalXp, xpOf } from './level'

describe('xpOf', () => {
  it('liest Werte aus der Konfiguration', () => {
    expect(xpOf({ type: 'workout_done' })).toBe(30)
    expect(xpOf({ type: 'quest_failed' })).toBe(-10)
    expect(xpOf({ type: 'unbekannt' })).toBe(0)
  })
  it('gibt bei erledigter Penalty den Abzug zurück', () => {
    expect(xpOf({ type: 'penalty_done', data: { failed: 3 } })).toBe(30)
  })
})

describe('totalXp', () => {
  it('fällt nicht unter 0', () => {
    expect(totalXp([{ type: 'quest_failed' }, { type: 'habit_done' }])).toBe(0)
  })
})

describe('levelFromXp', () => {
  it('startet bei Level 1', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, rank: 'E', into: 0, need: 100 })
  })
  it('steigt mit wachsendem Bedarf', () => {
    expect(levelFromXp(100)).toEqual({ level: 2, rank: 'E', into: 0, need: 120 })
    expect(levelFromXp(250)).toEqual({ level: 3, rank: 'E', into: 30, need: 140 })
  })
})

describe('rankOf', () => {
  it('ordnet Ränge zu', () => {
    expect(rankOf(9)).toBe('E')
    expect(rankOf(10)).toBe('D')
    expect(rankOf(49)).toBe('B')
    expect(rankOf(80)).toBe('S')
  })
})

describe('attributes', () => {
  it('zählt XP pro Attribut', () => {
    const events = [{ type: 'workout_done' }, { type: 'workout_done' }, { type: 'habit_done' }]
    expect(attributes(events)).toEqual({ str: 11, int: 10, vit: 10, cha: 10, wil: 10 })
  })
})
