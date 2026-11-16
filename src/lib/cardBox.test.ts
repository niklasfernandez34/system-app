import { describe, expect, it } from 'vitest'
import { dueCards, review } from './cardBox'

describe('review', () => {
  it('schiebt gewusste Karten ein Fach weiter', () => {
    expect(review(0, true, '2026-11-16')).toEqual({ box: 1, due: '2026-11-17' })
    expect(review(2, true, '2026-11-16')).toEqual({ box: 3, due: '2026-11-20' })
  })
  it('bleibt im letzten Fach', () => {
    expect(review(5, true, '2026-11-16')).toEqual({ box: 5, due: '2026-12-02' })
  })
  it('setzt nicht gewusste Karten auf heute zurück', () => {
    expect(review(4, false, '2026-11-16')).toEqual({ box: 0, due: '2026-11-16' })
  })
})

describe('dueCards', () => {
  it('nimmt nur fällige Karten, niedrigstes Fach zuerst', () => {
    const cards = [
      { id: 1, box: 2, due: '2026-11-15', createdAt: 1 },
      { id: 2, box: 0, due: '2026-11-16', createdAt: 2 },
      { id: 3, box: 1, due: '2026-11-17', createdAt: 3 },
    ]
    expect(dueCards(cards, '2026-11-16').map((c) => c.id)).toEqual([2, 1])
  })
})
