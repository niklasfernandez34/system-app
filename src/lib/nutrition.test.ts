import { describe, expect, it } from 'vitest'
import type { MealRecord } from '../db/db'
import { groupMeals, matchesFood, mealTotals, nutritionTargets, parseOffProduct, portion } from './nutrition'

const per100 = { kcal: 200, protein: 10, carbs: 30, fat: 5 }
const goals = { kcal: 500, protein: 25, carbs: 100, fat: 30, water: 2000 }
const meal = (group: string, grams: number, extra: Partial<MealRecord> = {}) =>
  ({ id: 0, day: '2026-11-16', slot: 'Mittag', foodId: 1, name: 'x', grams, per100, createdAt: 0, group, ...extra }) as MealRecord

describe('Ernährung', () => {
  it('rechnet Portionen und Summen', () => {
    expect(portion(per100, 250)).toEqual({ kcal: 500, protein: 25, carbs: 75, fat: 12.5 })
    expect(mealTotals([meal('a', 100), meal('b', 50)]).kcal).toBe(300)
  })

  it('zählt Mahlzeiten pro Gruppe, höchstens 5', () => {
    const recipe = [meal('r', 100), meal('r', 100), meal('r', 100)]
    expect(nutritionTargets(recipe, 0, goals).meal_logged).toBe(1)
    const many = Array.from({ length: 8 }, (_, i) => meal(String(i), 10))
    expect(nutritionTargets(many, 0, goals).meal_logged).toBe(5)
  })

  it('erkennt erreichte Ziele', () => {
    expect(nutritionTargets([meal('a', 200)], 1999, goals)).toEqual({
      meal_logged: 1,
      water_goal: 0,
      protein_goal: 0,
      kcal_goal: 0,
    })
    expect(nutritionTargets([meal('a', 250)], 2000, goals)).toEqual({
      meal_logged: 1,
      water_goal: 1,
      protein_goal: 1,
      kcal_goal: 1,
    })
    expect(nutritionTargets([], 5000, { ...goals, water: 0 }).water_goal).toBe(0)
  })

  it('gruppiert Rezepte innerhalb der Mahlzeit', () => {
    const slots = groupMeals([
      meal('r', 100, { recipeName: 'Nudelauflauf', createdAt: 2 }),
      meal('a', 100, { slot: 'Frühstück', createdAt: 1 }),
      meal('r', 50, { recipeName: 'Nudelauflauf', createdAt: 3 }),
    ])
    expect(slots.get('Mittag')).toHaveLength(1)
    expect(slots.get('Mittag')![0].items).toHaveLength(2)
    expect(slots.get('Frühstück')).toHaveLength(1)
    expect(slots.get('Abend')).toHaveLength(0)
  })

  it('sucht nach allen Wörtern', () => {
    expect(matchesFood({ name: 'Haferflocken zart', brand: 'Kölln' }, 'kölln hafer')).toBe(true)
    expect(matchesFood({ name: 'Haferflocken' }, 'reis')).toBe(false)
  })

  it('liest Open-Food-Facts-Produkte', () => {
    expect(
      parseOffProduct({
        code: '123',
        product_name: 'Skyr',
        brands: 'Milbona, Lidl',
        nutriments: { 'energy-kcal_100g': 63.4, proteins_100g: 11.04, carbohydrates_100g: 4, fat_100g: 0.2 },
      }),
    ).toEqual({ name: 'Skyr', brand: 'Milbona', barcode: '123', source: 'off', unit: 'g', kcal: 63, protein: 11, carbs: 4, fat: 0.2 })
    expect(parseOffProduct({ product_name: 'X', nutriments: { 'energy-kj_100g': 418.4 } })?.kcal).toBe(100)
    expect(parseOffProduct({ product_name: '', nutriments: { 'energy-kcal_100g': 1 } })).toBeNull()
    expect(parseOffProduct({ product_name: 'Ohne Werte' })).toBeNull()
  })
})
