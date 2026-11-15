import { describe, expect, it } from 'vitest'
import { daysBetween, logicalDay } from './day'

describe('logicalDay', () => {
  it('zählt Zeit vor 4 Uhr zum Vortag', () => {
    expect(logicalDay(new Date(2026, 10, 15, 1, 0), 4)).toBe('2026-11-14')
    expect(logicalDay(new Date(2026, 10, 15, 3, 59), 4)).toBe('2026-11-14')
  })
  it('zählt Zeit ab 4 Uhr zum neuen Tag', () => {
    expect(logicalDay(new Date(2026, 10, 15, 4, 0), 4)).toBe('2026-11-15')
    expect(logicalDay(new Date(2026, 10, 15, 23, 59), 4)).toBe('2026-11-15')
  })
  it('funktioniert mit anderer Startstunde', () => {
    expect(logicalDay(new Date(2026, 10, 15, 0, 30), 0)).toBe('2026-11-15')
    expect(logicalDay(new Date(2026, 10, 15, 5, 30), 6)).toBe('2026-11-14')
  })
  it('funktioniert über Monats- und Jahreswechsel', () => {
    expect(logicalDay(new Date(2027, 0, 1, 2, 0), 4)).toBe('2026-12-31')
  })
})

describe('daysBetween', () => {
  it('liefert die verpassten Tage dazwischen', () => {
    expect(daysBetween('2026-11-12', '2026-11-15')).toEqual(['2026-11-13', '2026-11-14'])
  })
  it('ist leer bei gleichem oder direkt folgendem Tag', () => {
    expect(daysBetween('2026-11-15', '2026-11-15')).toEqual([])
    expect(daysBetween('2026-11-14', '2026-11-15')).toEqual([])
  })
  it('ist leer beim ersten Start', () => {
    expect(daysBetween('', '2026-11-15')).toEqual([])
  })
})
