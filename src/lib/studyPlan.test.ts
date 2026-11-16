import { describe, expect, it } from 'vitest'
import { buildPlan } from './studyPlan'

describe('buildPlan', () => {
  it('verteilt Themen gleichmäßig und hängt Wiederholungstage an', () => {
    const plan = buildPlan(['A', 'B', 'C'], '2026-11-16', '2026-11-24', 2)
    expect(plan.map((t) => [t.day, t.title])).toEqual([
      ['2026-11-16', 'A'],
      ['2026-11-18', 'B'],
      ['2026-11-20', 'C'],
      ['2026-11-22', 'Wiederholen: alle Themen'],
      ['2026-11-23', 'Wiederholen: alle Themen'],
    ])
  })
  it('legt mehrere Themen auf einen Tag, wenn die Zeit knapp ist', () => {
    const plan = buildPlan(['A', 'B', 'C', 'D'], '2026-11-16', '2026-11-18', 0)
    expect(plan.map((t) => t.day)).toEqual(['2026-11-16', '2026-11-16', '2026-11-17', '2026-11-17'])
  })
  it('behält erledigte Aufgaben und plant nur den Rest neu', () => {
    const done = [{ id: 'x', day: '2026-11-10', title: 'A', done: true }]
    const plan = buildPlan(['A', 'B'], '2026-11-16', '2026-11-18', 0, done)
    expect(plan.map((t) => [t.title, t.day])).toEqual([
      ['A', '2026-11-10'],
      ['B', '2026-11-16'],
    ])
  })
  it('plant nichts nach dem Klausurtag', () => {
    expect(buildPlan(['A'], '2026-11-16', '2026-11-16', 1)).toEqual([])
  })
})
