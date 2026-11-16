import { describe, expect, it } from 'vitest'
import { bossBest } from './boss'

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
