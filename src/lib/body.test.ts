import { describe, expect, it } from 'vitest'
import { bodyChange, lastKnown } from './body'

const e = (day: string, weight?: number, waist?: number) => ({ day, weight, waist, updatedAt: 0 })

describe('bodyChange', () => {
  it('ist null ohne Werte', () => {
    expect(bodyChange([e('2026-11-01', undefined, 80)], 'weight', '2026-11-16')).toBeNull()
  })
  it('berechnet Gesamt- und 30-Tage-Veränderung', () => {
    const entries = [e('2026-09-01', 80), e('2026-10-10', 78.4), e('2026-11-16', 77.1)]
    expect(bodyChange(entries, 'weight', '2026-11-16')).toMatchObject({ last: 77.1, total: -2.9, last30: -1.3 })
  })
  it('nimmt den ersten Wert, wenn es nichts älter als 30 Tage gibt', () => {
    const entries = [e('2026-11-10', 80), e('2026-11-16', 79)]
    expect(bodyChange(entries, 'weight', '2026-11-16')).toMatchObject({ total: -1, last30: -1 })
  })
})

describe('lastKnown', () => {
  it('nimmt pro Feld den letzten Wert', () => {
    expect(lastKnown([e('2026-11-01', 80, 85), e('2026-11-02', 79)])).toEqual({ weight: 79, waist: 85 })
  })
})
