import { describe, expect, it } from 'vitest'
import { bossBest, nutritionBossStatus, nutritionDayMet, examOutcome } from './boss'

const w = (sets: [number, number, boolean][], exerciseId = 1) => ({
  entries: [{ exerciseId, targetReps: 5, sets: sets.map(([weight, reps, done]) => ({ weight, reps, done })) }],
})

describe('bossBest', () => {
  it('nimmt das höchste Gewicht mit genug Wiederholungen', () => {
    expect(bossBest([w([[80, 5, true], [90, 3, true]]), w([[85, 5, true]])], 1, 5)).toBe(85)
  })
  it('ignoriert nicht erledigte Sätze und andere Übungen', () => {
    expect(bossBest([w([[100, 5, false]]), w([[120, 5, true]], 2)], 1, 1)).toBe(0)
  })
})

describe('Ernährungs-Boss', () => {
  const v = (kcal: number, logged = true) => ({ kcal, protein: 0, water: 0, logged })
  const days = (list: [string, number][]) => new Map(list.map(([d, k]) => [d, v(k)]))
  const min = { metric: 'kcal' as const, direction: 'min' as const, target: 2500, days: 3, startDay: '2026-11-10', deadline: '2026-11-14' }
  const max = { ...min, direction: 'max' as const, target: 2000 }

  it('zählt Tage mit mindestens dem Zielwert, heute sofort', () => {
    const s = nutritionBossStatus(min, days([['2026-11-10', 2600], ['2026-11-11', 2000], ['2026-11-12', 2500]]), '2026-11-12')
    expect(s).toMatchObject({ done: 2, need: 3, won: false, impossible: false })
    expect(nutritionBossStatus(min, days([['2026-11-10', 2600], ['2026-11-12', 2500], ['2026-11-13', 3000]]), '2026-11-13').won).toBe(true)
  })

  it('ignoriert Tage vor dem Start und nach dem Termin', () => {
    expect(nutritionBossStatus(min, days([['2026-11-09', 3000], ['2026-11-15', 3000]]), '2026-11-15').done).toBe(0)
  })

  it('zählt bei „höchstens“ nur abgeschlossene Tage mit Einträgen', () => {
    const vals = new Map([
      ['2026-11-10', v(1800)],
      ['2026-11-11', v(0, false)],
      ['2026-11-12', v(500)],
    ])
    expect(nutritionBossStatus(max, vals, '2026-11-12').done).toBe(1)
    expect(nutritionBossStatus(max, vals, '2026-11-13').done).toBe(2)
  })

  it('erkennt, wenn es nicht mehr zu schaffen ist', () => {
    expect(nutritionBossStatus(min, days([['2026-11-10', 1000]]), '2026-11-13').impossible).toBe(true)
    expect(nutritionBossStatus(min, days([['2026-11-10', 3000]]), '2026-11-13').impossible).toBe(false)
    expect(nutritionBossStatus(min, days([['2026-11-10', 3000], ['2026-11-13', 3000]]), '2026-11-14').impossible).toBe(false)
    expect(nutritionBossStatus(min, days([['2026-11-10', 3000], ['2026-11-13', 3000]]), '2026-11-15').impossible).toBe(true)
  })

  it('wertet Eiweiß und Wasser', () => {
    const b = { ...min, metric: 'water' as const, target: 3000 }
    expect(nutritionDayMet(b, { kcal: 0, protein: 0, water: 3000, logged: false })).toBe(true)
    expect(nutritionDayMet({ ...b, metric: 'protein', target: 150 }, { kcal: 0, protein: 149, water: 0, logged: true })).toBe(false)
  })
})

describe('examOutcome', () => {
  it('wartet ohne Ergebnis', () => {
    expect(examOutcome({ target: 2 })).toBe(null)
  })
  it('gewinnt bei bestanden ohne Wunschnote', () => {
    expect(examOutcome({ target: 0, result: { passed: true } })).toBe('won')
  })
  it('gewinnt mit Wunschnote oder besser', () => {
    expect(examOutcome({ target: 2, result: { passed: true, grade: 2 } })).toBe('won')
    expect(examOutcome({ target: 2, result: { passed: true, grade: 1.3 } })).toBe('won')
  })
  it('verliert bei schlechterer Note oder nicht bestanden', () => {
    expect(examOutcome({ target: 2, result: { passed: true, grade: 2.3 } })).toBe('lost')
    expect(examOutcome({ target: 0, result: { passed: false } })).toBe('lost')
  })
})
