import { describe, expect, it } from 'vitest'
import { calcStreak } from './streak'

describe('calcStreak', () => {
  it('ist 0 ohne Einträge', () => {
    expect(calcStreak([], '2026-11-16')).toEqual({ current: 0, longest: 0 })
  })
  it('zählt Serie bis heute', () => {
    expect(calcStreak(['2026-11-14', '2026-11-15', '2026-11-16'], '2026-11-16').current).toBe(3)
  })
  it('bleibt erhalten, wenn heute noch offen ist', () => {
    expect(calcStreak(['2026-11-14', '2026-11-15'], '2026-11-16').current).toBe(2)
  })
  it('reißt nach einem verpassten Tag ab', () => {
    expect(calcStreak(['2026-11-13', '2026-11-14'], '2026-11-16').current).toBe(0)
  })
  it('findet die längste Serie', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-10', '2026-11-16']
    expect(calcStreak(days, '2026-11-16')).toEqual({ current: 1, longest: 4 })
  })
  it('funktioniert über Monats- und Jahreswechsel', () => {
    expect(calcStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01').current).toBe(3)
  })
  it('ignoriert doppelte Tage', () => {
    expect(calcStreak(['2026-11-16', '2026-11-16'], '2026-11-16')).toEqual({ current: 1, longest: 1 })
  })
})
