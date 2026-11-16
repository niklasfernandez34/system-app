import { describe, expect, it } from 'vitest'
import { attributes, rankIndexOf, rankProgress, roman, totalXp, xpOf } from './level'

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

describe('rankIndexOf', () => {
  it('zählt Rangaufstiege', () => {
    expect(rankIndexOf([])).toBe(0)
    expect(rankIndexOf([{ type: 'rank_up' }, { type: 'rank_up' }])).toBe(2)
  })
})

describe('rankProgress', () => {
  it('startet bei E I', () => {
    expect(rankProgress(0, 0)).toEqual({ rank: 'E', stage: 1, into: 0, stageSize: 110, ready: false })
  })
  it('steigt in Stufen auf', () => {
    expect(rankProgress(230, 0)).toMatchObject({ stage: 3, into: 10 })
  })
  it('bleibt bei Stufe V voll, bis die Prüfung bestanden ist', () => {
    expect(rankProgress(2000, 0)).toEqual({ rank: 'E', stage: 5, into: 110, stageSize: 110, ready: true })
  })
  it('zählt im nächsten Rang ab dessen Startwert', () => {
    expect(rankProgress(550, 1)).toMatchObject({ rank: 'D', stage: 1, into: 0, stageSize: 300 })
    expect(rankProgress(100, 1)).toMatchObject({ stage: 1, into: 0 })
  })
  it('hat in Rang S endlose Stufen', () => {
    const start = 550 + 1500 + 3500 + 8000 + 15000
    expect(rankProgress(start + 3000 * 7 + 5, 5)).toMatchObject({ rank: 'S', stage: 8, into: 5, ready: false })
  })
})

describe('roman', () => {
  it('schreibt römische Zahlen', () => {
    expect([1, 4, 5].map(roman)).toEqual(['I', 'IV', 'V'])
  })
})

describe('attributes', () => {
  it('zählt XP pro Attribut', () => {
    const events = [{ type: 'workout_done' }, { type: 'workout_done' }, { type: 'habit_done' }]
    expect(attributes(events)).toEqual({ str: 11, int: 10, vit: 10, cha: 10, wil: 10 })
  })
})
