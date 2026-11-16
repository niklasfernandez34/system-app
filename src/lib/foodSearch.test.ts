import { describe, expect, it } from 'vitest'
import { createIndex, loadBase, normalize, rowToFood, synonymsOf, words } from './foodSearch'
import { fmtAmount, parseOffProduct } from './nutrition'
import { dedupeFoods } from './foodApi'

describe('Lebensmittel-Suche', () => {
  it('vereinheitlicht Text', () => {
    expect(normalize('Müsli Größe')).toBe('muesli groesse')
    expect(words('Milch 1,5% Fett')).toEqual(['milch', '1.5', 'fett'])
    expect(words('1.5 % Milch')).toEqual(['1.5', 'milch'])
  })

  it('kennt Synonyme', () => {
    expect(synonymsOf('whey')).toContain('proteinpulver')
    expect(synonymsOf('sahne')).toContain('rahm')
    expect(synonymsOf('xyz')).toEqual(['xyz'])
  })

  it('findet unabhängig von Reihenfolge, Komma und Wortteilen', () => {
    const search = createIndex([
      { id: 1, name: 'Fettarme H-Milch 1,5 % Fett' },
      { id: 2, name: 'Vollmilch 3,5%' },
      { id: 3, name: 'Proteinpulver Vanille' },
      { id: 4, name: 'Protein Pulver Schoko' },
      { id: 5, name: 'Halbentrahmte Milch 1.5% Fett, UHT' },
    ])
    expect(search('1,5% milch')).toEqual(expect.arrayContaining([1, 5]))
    expect(search('1,5% milch')).not.toContain(2)
    expect(search('milch')).toContain(2)
    expect(search('whey')).toEqual(expect.arrayContaining([3, 4]))
    expect(search('fettarme milch')).toEqual(expect.arrayContaining([1, 5]))
    expect(search('protien')).toEqual(expect.arrayContaining([3, 4]))
  })

  it('zeigt Ersatztreffer, wenn nicht alle Wörter passen', () => {
    const search = createIndex([
      { id: 1, name: 'Whey Protein Vanilla', brand: 'Bulk' },
      { id: 2, name: 'Erdnussbutter', brand: 'Bulk' },
      { id: 3, name: 'Haferflocken' },
    ])
    expect(search('bulk pure whey')[0]).toBe(1)
    expect(search('bulk pure whey')).not.toContain(3)
    expect(search('haferflocken')).toEqual([3])
  })

  it('filtert doppelte Online-Treffer', () => {
    const f = { name: 'Bulk pure whey', brand: 'Bulk', source: 'off' as const, kcal: 377, protein: 77, carbs: 5, fat: 6 }
    expect(dedupeFoods([f, { ...f, barcode: '2' }, { ...f, kcal: 387 }])).toHaveLength(2)
  })

  it('durchsucht die eingebaute Datenbank', async () => {
    const { rows, search } = await loadBase()
    expect(rows.length).toBeGreaterThan(5000)
    const milk = search('1,5% milch', 10).map((i) => rowToFood(rows[i]))
    expect(milk.length).toBeGreaterThan(3)
    expect(milk.every((f) => /1[.,]5/.test(f.name))).toBe(true)
    expect(milk[0].unit).toBe('ml')
    const whey = search('whey', 10).map((i) => rows[i][1].toLowerCase())
    expect(whey.some((n) => n.includes('whey') || n.includes('protein'))).toBe(true)
    expect(search('haferflocken', 5).length).toBe(5)
  })

  it('erkennt ml und zeigt Liter', () => {
    expect(parseOffProduct({ product_name: 'Cola', quantity: '1,5 l', nutriments: { 'energy-kcal_100g': 42 } })?.unit).toBe('ml')
    expect(parseOffProduct({ product_name: 'Reis', brands: ['Oryza'], nutriments: { 'energy-kcal_100g': 350 } })).toMatchObject({
      unit: 'g',
      brand: 'Oryza',
    })
    expect(parseOffProduct({ product_name: 'Pure Whey Protein', quantity: '1000 ml', nutriments: { 'energy-kcal_100g': 390 } })?.unit).toBe('g')
    expect(fmtAmount(1500, 'ml')).toBe('1,5 l')
    expect(fmtAmount(330, 'ml')).toBe('330 ml')
    expect(fmtAmount(250)).toBe('250 g')
  })
})
