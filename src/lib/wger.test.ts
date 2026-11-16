import { describe, expect, it } from 'vitest'
import { matchesOwn, searchWger, type WgerExercise } from './wger'

const w = (id: number, name: string, group: string, muscles: string[], equipment: string[]): WgerExercise => ({
  id,
  name,
  group,
  muscles,
  secondary: [],
  equipment,
  description: '',
  author: '',
})

const list = [
  w(1, 'Bankdrücken LH', 'Brust', ['Brust'], ['Langhantel', 'Bank']),
  w(2, 'Dips', 'Trizeps', ['Trizeps', 'Brust'], ['Körpergewicht']),
  w(3, 'Latzug', 'Rücken', ['Latissimus'], ['Kabelzug / Latzug']),
  w(4, 'Cable Crossover', 'Brust', ['Brust'], ['Kabelzug / Latzug']),
]

describe('searchWger', () => {
  it('liefert ohne Suche und Filter nichts', () => {
    expect(searchWger(list, { query: '' })).toEqual([])
  })
  it('filtert nach Muskelgruppe inkl. Hauptmuskeln', () => {
    expect(searchWger(list, { query: '', group: 'Brust' }).map((e) => e.id).sort()).toEqual([1, 2, 4])
  })
  it('filtert nach Gerät', () => {
    expect(searchWger(list, { query: '', equipment: 'Kabelzug / Latzug' }).map((e) => e.id).sort()).toEqual([3, 4])
  })
  it('kombiniert Filter und Suche', () => {
    expect(searchWger(list, { query: 'cro', group: 'Brust', equipment: 'Kabelzug / Latzug' }).map((e) => e.id)).toEqual([4])
  })
})

describe('matchesOwn', () => {
  const own = { id: 9, name: 'Brustpresse', muscle: 'Brust', createdAt: 0, equipment: 'Maschine' }
  it('prüft Gruppe und Gerät eigener Übungen', () => {
    expect(matchesOwn(own, { query: '', group: 'Brust', equipment: 'Maschine' })).toBe(true)
    expect(matchesOwn(own, { query: '', equipment: 'Kurzhantel' })).toBe(false)
  })
})
