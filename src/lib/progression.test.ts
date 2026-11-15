import { describe, expect, it } from 'vitest'
import { suggestWeight } from './progression'

const item = { exerciseId: 1, sets: 3, reps: 8, weight: 40 }
const entry = (sets: [number, number, boolean][]) => ({
  exerciseId: 1,
  targetReps: 8,
  sets: sets.map(([weight, reps, done]) => ({ weight, reps, done })),
})

describe('suggestWeight', () => {
  it('nimmt das Startgewicht ohne Vorgeschichte', () => {
    expect(suggestWeight(item, undefined, 2.5)).toBe(40)
  })
  it('steigert, wenn alle Sätze geschafft sind', () => {
    expect(suggestWeight(item, entry([[50, 8, true], [50, 8, true], [50, 9, true]]), 2.5)).toBe(52.5)
  })
  it('bleibt gleich, wenn Wiederholungen fehlen', () => {
    expect(suggestWeight(item, entry([[50, 8, true], [50, 8, true], [50, 6, true]]), 2.5)).toBe(50)
  })
  it('bleibt gleich, wenn ein Satz nicht abgehakt ist', () => {
    expect(suggestWeight(item, entry([[50, 8, true], [50, 8, true], [50, 8, false]]), 2.5)).toBe(50)
  })
  it('nimmt das Startgewicht, wenn nichts abgehakt war', () => {
    expect(suggestWeight(item, entry([[50, 8, false]]), 2.5)).toBe(40)
  })
  it('vermeidet Rundungsfehler', () => {
    expect(suggestWeight(item, entry([[0.1, 8, true]]), 0.2)).toBe(0.3)
  })
})
