import { describe, expect, it } from 'vitest'
import { TITLES } from '../config/titles'
import { computeMetrics, titleStatus } from './titles'

const ev = (type: string, day: string, data?: Record<string, unknown>) => ({ type, day, data })

describe('TITLES', () => {
  it('hat rund 100 eindeutige Titel', () => {
    expect(TITLES.length).toBeGreaterThanOrEqual(100)
    expect(new Set(TITLES.map((t) => t.id)).size).toBe(TITLES.length)
    expect(new Set(TITLES.map((t) => t.name)).size).toBe(TITLES.length)
  })
})

describe('computeMetrics', () => {
  it('zählt Werte aus dem Log', () => {
    const events = [
      ev('workout_done', '2026-11-14', { volume: 1200 }),
      ev('workout_done', '2026-11-15', { volume: 800 }),
      ev('checkin_done', '2026-11-14'),
      ev('checkin_done', '2026-11-15'),
      ev('rank_up', '2026-11-15'),
    ]
    const m = computeMetrics(events, '2026-11-16')
    expect(m).toMatchObject({ activeDays: 2, workouts: 2, volume: 2000, checkinStreak: 2, rank: 1, xp: 80 })
  })
})

describe('titleStatus', () => {
  it('schaltet Titel ab dem Schwellenwert frei', () => {
    const status = titleStatus([ev('workout_done', '2026-11-15', { volume: 1000 })], '2026-11-16')
    const unlocked = status.filter((t) => t.unlocked).map((t) => t.name)
    expect(unlocked).toEqual(['Erwacht', 'Eisenhand', 'Lastenträger'])
  })
})
