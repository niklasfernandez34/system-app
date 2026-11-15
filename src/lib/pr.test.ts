import { describe, expect, it } from 'vitest'
import { detectPRs, e1rm } from './pr'

const entry = (exerciseId: number, sets: [number, number, boolean?][]) => ({
  exerciseId,
  targetReps: 5,
  sets: sets.map(([weight, reps, done = true]) => ({ weight, reps, done })),
})

describe('e1rm', () => {
  it('ist bei einer Wiederholung das Gewicht', () => {
    expect(e1rm(100, 1)).toBe(100)
  })
  it('rechnet nach Epley', () => {
    expect(e1rm(100, 10)).toBe(133.3)
  })
  it('ist 0 ohne Wiederholungen', () => {
    expect(e1rm(100, 0)).toBe(0)
  })
})

describe('detectPRs', () => {
  it('meldet beim ersten Training keine PRs', () => {
    expect(detectPRs([], [entry(1, [[50, 5]])])).toEqual([])
  })
  it('erkennt neues Höchstgewicht', () => {
    expect(detectPRs([entry(1, [[50, 5]])], [entry(1, [[55, 3]])])).toEqual([
      { exerciseId: 1, kind: 'weight', value: 55, previous: 50 },
    ])
  })
  it('erkennt besseres 1RM bei gleichem Gewicht', () => {
    const prs = detectPRs([entry(1, [[50, 5]])], [entry(1, [[50, 8]])])
    expect(prs).toHaveLength(1)
    expect(prs[0].kind).toBe('e1rm')
  })
  it('ignoriert nicht abgehakte Sätze', () => {
    expect(detectPRs([entry(1, [[50, 5]])], [entry(1, [[80, 5, false]])])).toEqual([])
  })
  it('trennt Übungen', () => {
    expect(detectPRs([entry(1, [[100, 5]])], [entry(2, [[50, 5]])])).toEqual([])
  })
})
