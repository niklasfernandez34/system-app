import { describe, expect, it } from 'vitest'
import type { Stroke } from '../db/db'
import { hitStroke, isEmpty, strokePath } from './drawing'

const line: Stroke = { tool: 'pen', color: '#fff', size: 6, points: [[0, 0, 0.5], [100, 0, 0.5]] }

describe('hitStroke', () => {
  it('trifft Punkte auf und nahe der Linie', () => {
    expect(hitStroke(line, 50, 0, 5)).toBe(true)
    expect(hitStroke(line, 50, 7, 5)).toBe(true)
  })
  it('verfehlt weit entfernte Punkte', () => {
    expect(hitStroke(line, 50, 30, 5)).toBe(false)
    expect(hitStroke(line, 130, 0, 5)).toBe(false)
  })
})

describe('strokePath', () => {
  it('erzeugt einen geschlossenen SVG-Pfad', () => {
    const d = strokePath({ ...line, points: [[0, 0, 0.5], [10, 5, 0.6], [20, 10, 0.7], [30, 12, 0.5]] })
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
  })
})

describe('Punkte', () => {
  it('zeichnet ein Antippen als Punkt', () => {
    const d = strokePath({ ...line, points: [[50, 50, 0.5]] })
    expect(d).toContain('a')
    expect(d.endsWith('Z')).toBe(true)
  })
})

describe('isEmpty', () => {
  it('erkennt leere Seiten', () => {
    expect(isEmpty([[], []])).toBe(true)
    expect(isEmpty([[], [line]])).toBe(false)
  })
})
