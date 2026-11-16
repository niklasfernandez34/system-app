import { describe, expect, it } from 'vitest'
import { addDays, format } from 'date-fns'
import { insights } from './insights'
import type { DayValues } from './stats'

const days = Array.from({ length: 20 }, (_, i) => format(addDays(new Date(2026, 9, 1), i), 'yyyy-MM-dd'))

function build(fn: (i: number) => DayValues) {
  return new Map(days.map((d, i) => [d, fn(i)]))
}

describe('insights', () => {
  it('findet mehr Volumen nach gutem Schlaf', () => {
    const daily = build((i) => (i % 2 ? { sleepHours: 8, workouts: 1, volume: 1200 } : { sleepHours: 6, workouts: 1, volume: 1000 }))
    const r = insights(daily, days).found.find((x) => x.rule.id === 'sleep-volume')
    expect(r).toMatchObject({ a: 1200, b: 1000, nA: 10, nB: 10 })
    expect(r!.diff).toBeCloseTo(20)
  })
  it('zeigt nichts bei kleinen Unterschieden', () => {
    const daily = build((i) => ({ sleepHours: i % 2 ? 8 : 6, mood: i % 2 ? 4.1 : 4 }))
    expect(insights(daily, days).found.find((x) => x.rule.id === 'sleep-mood')).toBeUndefined()
  })
  it('wartet, bis beide Gruppen genug Tage haben', () => {
    const daily = build((i) => ({ sleepHours: i < 3 ? 8 : 6, mood: i < 3 ? 5 : 2 }))
    const r = insights(daily, days)
    expect(r.found.find((x) => x.rule.id === 'sleep-mood')).toBeUndefined()
    expect(r.waiting).toBeGreaterThan(0)
  })
  it('zählt Pflegetage der letzten 7 Tage', () => {
    const daily = build((i) => ({ skinRoutines: i >= 10 ? 1 : 0, skinRating: i >= 14 ? 4 : 2 }))
    const r = insights(daily, days).found.find((x) => x.rule.id === 'skin-rating')
    expect(r).toMatchObject({ a: 4, b: 2, nA: 6, nB: 14 })
  })
})
