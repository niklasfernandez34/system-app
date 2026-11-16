import { describe, expect, it } from 'vitest'
import { bestSet, longestHabitStreak, questDaysSince, sportCheck } from './rankExam'

const workout = (finishedAt: number, weight: number, reps: number, done = true) => ({
  finishedAt,
  entries: [{ exerciseId: 1, targetReps: 8, sets: [{ weight, reps, done }] }],
})

describe('bestSet', () => {
  it('nimmt den besten erledigten Satz', () => {
    const entries = [{ exerciseId: 1, targetReps: 8, sets: [{ weight: 25, reps: 8, done: true }, { weight: 40, reps: 8, done: false }] }]
    expect(bestSet(entries, 1)).toBe(200)
    expect(bestSet(entries, 2)).toBe(0)
  })
})

describe('sportCheck', () => {
  it('Beispiel: 30 × 7 gegenüber 25 × 8 reicht nicht für 7,5 %', () => {
    expect(sportCheck(200, [workout(1, 30, 7)], 1, 0.075)).toEqual({
      baseline: 200,
      current: 210,
      target: 215,
      passed: false,
    })
  })
  it('besteht bei genau erreichter Steigerung', () => {
    expect(sportCheck(200, [workout(1, 30, 7)], 1, 0.05).passed).toBe(true)
  })
  it('nimmt ohne Startwert das erste Training als Start', () => {
    expect(sportCheck(null, [workout(2, 30, 8), workout(1, 25, 8)], 1, 0.05)).toEqual({
      baseline: 200,
      current: 240,
      target: 210,
      passed: true,
    })
  })
  it('ist ohne Training nicht bestanden', () => {
    expect(sportCheck(null, [], 1, 0.05).passed).toBe(false)
  })
})

describe('questDaysSince', () => {
  it('zählt Tage mit allen Quests ab Rangbeginn', () => {
    const events = ['2026-11-01', '2026-11-05', '2026-11-06'].map((day) => ({ type: 'quests_completed', day }))
    expect(questDaysSince(events, '2026-11-05')).toBe(2)
  })
})

describe('longestHabitStreak', () => {
  it('nimmt die längste Serie eines Habits ab Rangbeginn', () => {
    const ev = (habitId: number, day: string) => ({ type: 'habit_done', day, data: { habitId } })
    const events = [
      ev(1, '2026-11-01'),
      ev(1, '2026-11-02'),
      ev(1, '2026-11-03'),
      ev(2, '2026-11-02'),
      ev(2, '2026-11-03'),
    ]
    expect(longestHabitStreak(events, '2026-11-02', '2026-11-16')).toBe(2)
    expect(longestHabitStreak([], '2026-11-02', '2026-11-16')).toBe(0)
  })
})
