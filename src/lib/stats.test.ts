import { describe, expect, it } from 'vitest'
import { aggregate, buckets, dailyValues, reviewWeek, weekReview } from './stats'

const input = {
  events: [
    { type: 'workout_done', day: '2026-11-10', data: { volume: 1000 } },
    { type: 'pr_set', day: '2026-11-10' },
    { type: 'habit_done', day: '2026-11-11' },
    { type: 'skin_rated', day: '2026-11-12', data: { value: 4 } },
  ],
  meals: [
    { day: '2026-11-10', group: 'a', grams: 200, per100: { kcal: 100, protein: 10, carbs: 0, fat: 0 } },
    { day: '2026-11-11', group: 'b', grams: 100, per100: { kcal: 400, protein: 20, carbs: 0, fat: 0 } },
  ],
  water: [{ day: '2026-11-10', ml: 2000 }],
  body: [{ day: '2026-11-10', weight: 80 }, { day: '2026-11-11' }],
  journal: [{ day: '2026-11-11', sleepHours: 7.5, mood: 4, energy: 3 }],
}

describe('dailyValues', () => {
  const daily = dailyValues(input)
  it('rechnet XP, Training und Habits aus dem Log', () => {
    expect(daily.get('2026-11-10')).toMatchObject({ xp: 45, workouts: 1, volume: 1000, prs: 1, kcal: 200, protein: 20, water: 2000, weight: 80 })
    expect(daily.get('2026-11-11')).toMatchObject({ habits: 1, kcal: 400, sleepHours: 7.5, mood: 4 })
    expect(daily.get('2026-11-11')?.weight).toBeUndefined()
    expect(daily.get('2026-11-12')?.skinRating).toBe(4)
  })
  it('summiert Zähler und mittelt Messwerte nur über Tage mit Wert', () => {
    const days = ['2026-11-10', '2026-11-11', '2026-11-12']
    expect(aggregate(daily, days, 'workouts')).toBe(1)
    expect(aggregate(daily, days, 'kcal')).toBe(300)
    expect(aggregate(daily, ['2026-11-12'], 'kcal')).toBeNull()
    expect(aggregate(daily, ['2026-11-12'], 'prs')).toBe(0)
  })
})

describe('buckets', () => {
  it('4 Wochen = 28 einzelne Tage bis heute', () => {
    const b = buckets('2026-11-16', '4 Wochen')
    expect(b).toHaveLength(28)
    expect(b[27].days).toEqual(['2026-11-16'])
  })
  it('3 Monate = 13 Wochen ab Montag, letzte endet heute', () => {
    const b = buckets('2026-11-18', '3 Monate')
    expect(b).toHaveLength(13)
    expect(b[12].days).toEqual(['2026-11-16', '2026-11-17', '2026-11-18'])
  })
  it('1 Jahr = 12 Monate', () => {
    const b = buckets('2026-11-16', '1 Jahr')
    expect(b).toHaveLength(12)
    expect(b[0].days[0]).toBe('2025-12-01')
    expect(b[11].days.at(-1)).toBe('2026-11-16')
  })
})

describe('reviewWeek', () => {
  it('zeigt sonntags die laufende Woche', () => {
    expect(reviewWeek('2026-11-15')).toMatchObject({ start: '2026-11-09', end: '2026-11-15' })
  })
  it('zeigt sonst die letzte volle Woche', () => {
    const w = reviewWeek('2026-11-18')
    expect(w).toMatchObject({ start: '2026-11-09', end: '2026-11-15' })
    expect(w.prev[0]).toBe('2026-11-02')
  })
  it('vergleicht mit der Vorwoche', () => {
    const daily = dailyValues(input)
    const rows = weekReview(daily, reviewWeek('2026-11-18'))
    expect(rows.find((r) => r.metric.key === 'workouts')).toMatchObject({ value: 1, prev: 0 })
  })
})
