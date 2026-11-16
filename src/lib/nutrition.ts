import { useLiveQuery } from 'dexie-react-hooks'
import { MEAL_XP_MAX_PER_DAY } from '../config/xp'
import {
  db,
  MEAL_SLOTS,
  type EventRecord,
  type FoodRecord,
  type Macros,
  type MealRecord,
  type MealSlot,
  type RecipeRecord,
} from '../db/db'
import { getSetting } from '../db/settings'
import { currentDay } from './events'

export type Goals = Macros & { water: number }
export type NutritionEvent = 'meal_logged' | 'water_goal' | 'protein_goal' | 'kcal_goal'
export type NewFood = Omit<FoodRecord, 'id'>

const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export function portion(per100: Macros, grams: number): Macros {
  const f = grams / 100
  return { kcal: per100.kcal * f, protein: per100.protein * f, carbs: per100.carbs * f, fat: per100.fat * f }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (s, m) => ({ kcal: s.kcal + m.kcal, protein: s.protein + m.protein, carbs: s.carbs + m.carbs, fat: s.fat + m.fat }),
    ZERO,
  )
}

type MealLike = Pick<MealRecord, 'group' | 'grams' | 'per100'>

export function mealTotals(meals: MealLike[]) {
  return sumMacros(meals.map((m) => portion(m.per100, m.grams)))
}

export function nutritionTargets(meals: MealLike[], waterMl: number, goals: Goals): Record<NutritionEvent, number> {
  const t = mealTotals(meals)
  return {
    meal_logged: Math.min(MEAL_XP_MAX_PER_DAY, new Set(meals.map((m) => m.group)).size),
    water_goal: goals.water > 0 && waterMl >= goals.water ? 1 : 0,
    protein_goal: goals.protein > 0 && t.protein >= goals.protein ? 1 : 0,
    kcal_goal: goals.kcal > 0 && t.kcal >= goals.kcal ? 1 : 0,
  }
}

export type MealGroup = { group: string; slot: MealSlot; recipeName?: string; items: MealRecord[] }

export function groupMeals(meals: MealRecord[]) {
  const bySlot = new Map<MealSlot, MealGroup[]>(MEAL_SLOTS.map((s) => [s, []]))
  const byGroup = new Map<string, MealGroup>()
  for (const m of [...meals].sort((a, b) => a.createdAt - b.createdAt)) {
    let g = byGroup.get(m.group)
    if (!g) {
      g = { group: m.group, slot: m.slot, recipeName: m.recipeName, items: [] }
      byGroup.set(m.group, g)
      bySlot.get(m.slot)!.push(g)
    }
    g.items.push(m)
  }
  return bySlot
}

export function matchesFood(food: Pick<FoodRecord, 'name' | 'brand'>, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = `${food.name} ${food.brand ?? ''}`.toLowerCase()
  return words.every((w) => text.includes(w))
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function parseOffProduct(p: Record<string, unknown>): NewFood | null {
  const n = (p.nutriments ?? {}) as Record<string, unknown>
  const num = (k: string) => {
    const v = Number(n[k])
    return Number.isFinite(v) && v >= 0 ? v : undefined
  }
  const name = String(p.product_name_de || p.product_name || '').trim()
  const kj = num('energy-kj_100g') ?? num('energy_100g')
  const kcal = num('energy-kcal_100g') ?? (kj !== undefined ? kj / 4.184 : undefined)
  if (!name || kcal === undefined) return null
  const brand = String(p.brands ?? '').split(',')[0].trim()
  return {
    name,
    brand: brand || undefined,
    barcode: p.code ? String(p.code) : undefined,
    source: 'off',
    kcal: Math.round(kcal),
    protein: round1(num('proteins_100g') ?? 0),
    carbs: round1(num('carbohydrates_100g') ?? 0),
    fat: round1(num('fat_100g') ?? 0),
  }
}

export function fmtNum(n: number) {
  return Math.round(n).toLocaleString('de-DE')
}

async function readGoals(): Promise<Goals> {
  return {
    kcal: await getSetting('kcalGoal'),
    protein: await getSetting('proteinGoal'),
    carbs: await getSetting('carbsGoal'),
    fat: await getSetting('fatGoal'),
    water: await getSetting('waterGoal'),
  }
}

const TYPES: NutritionEvent[] = ['meal_logged', 'water_goal', 'protein_goal', 'kcal_goal']

export async function syncNutrition(day: string) {
  await db.transaction('rw', [db.events, db.meals, db.water, db.settings], async () => {
    const meals = await db.meals.where('day').equals(day).toArray()
    const water = (await db.water.get(day))?.ml ?? 0
    const targets = nutritionTargets(meals, water, await readGoals())
    for (const type of TYPES) {
      const existing = await db.events.where('[type+day]').equals([type, day]).sortBy('at')
      const diff = targets[type] - existing.length
      for (let i = 0; i < diff; i++) await db.events.add({ type, day, at: Date.now() } as EventRecord)
      if (diff < 0) await db.events.bulkDelete(existing.slice(diff).map((e) => e.id))
    }
  })
}

const newGroup = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const per100Of = (f: Macros): Macros => ({ kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })

export async function addFood(day: string, slot: MealSlot, food: FoodRecord, grams: number) {
  await db.meals.add({
    day,
    slot,
    foodId: food.id,
    name: food.name,
    grams,
    per100: per100Of(food),
    createdAt: Date.now(),
    group: newGroup(),
  } as MealRecord)
  await db.foods.update(food.id, { lastGrams: grams, lastUsedAt: Date.now() })
  await syncNutrition(day)
}

export async function addRecipe(day: string, slot: MealSlot, recipe: RecipeRecord) {
  const foods = await db.foods.bulkGet(recipe.items.map((i) => i.foodId))
  const group = newGroup()
  const now = Date.now()
  const rows = recipe.items.flatMap((item, i) => {
    const food = foods[i]
    if (!food) return []
    return [
      {
        day,
        slot,
        foodId: food.id,
        name: food.name,
        grams: item.grams,
        per100: per100Of(food),
        createdAt: now + i,
        group,
        recipeId: recipe.id,
        recipeName: recipe.name,
      } as MealRecord,
    ]
  })
  await db.meals.bulkAdd(rows)
  await db.recipes.update(recipe.id, { lastUsedAt: now })
  await syncNutrition(day)
}

export async function updateMealGrams(meal: MealRecord, grams: number) {
  await db.meals.update(meal.id, { grams })
  await syncNutrition(meal.day)
}

export async function deleteMeal(meal: MealRecord) {
  await db.meals.delete(meal.id)
  await syncNutrition(meal.day)
}

export async function deleteGroup(day: string, group: string) {
  await db.meals.where('group').equals(group).delete()
  await syncNutrition(day)
}

export async function addWater(day: string, delta: number) {
  const ml = Math.max(0, ((await db.water.get(day))?.ml ?? 0) + delta)
  await db.water.put({ day, ml })
  await syncNutrition(day)
}

export async function saveOwnFood(food: Omit<NewFood, 'source'> & { id?: number }) {
  if (food.id) {
    await db.foods.update(food.id, food)
    return food.id
  }
  return db.foods.add({ ...food, source: 'own' } as FoodRecord)
}

export async function adoptFood(food: NewFood) {
  const existing = food.barcode ? await db.foods.where('barcode').equals(food.barcode).first() : undefined
  if (existing) return existing
  const id = await db.foods.add(food as FoodRecord)
  return (await db.foods.get(id))!
}

export async function toggleFavorite(food: FoodRecord) {
  await db.foods.update(food.id, { favorite: !food.favorite })
}

export async function saveRecipe(recipe: Omit<RecipeRecord, 'id' | 'createdAt'> & { id?: number }) {
  if (recipe.id) {
    const { id, ...rest } = recipe
    await db.recipes.update(id, rest)
    return id
  }
  return db.recipes.add({ ...recipe, createdAt: Date.now() } as RecipeRecord)
}

export function deleteRecipe(id: number) {
  return db.recipes.delete(id)
}

export function useGoals() {
  return useLiveQuery(readGoals)
}

export function useDayNutrition(day?: string) {
  return useLiveQuery(async () => {
    const today = await currentDay()
    const d = day ?? today
    const meals = await db.meals.where('day').equals(d).toArray()
    const water = (await db.water.get(d))?.ml ?? 0
    return { day: d, today, meals, water, totals: mealTotals(meals), goals: await readGoals() }
  }, [day])
}

export function useFoods() {
  return useLiveQuery(async () => (await db.foods.toArray()).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)))
}

export function useRecipes() {
  return useLiveQuery(() => db.recipes.orderBy('name').toArray())
}

export function useRecipe(id?: number) {
  return useLiveQuery(() => (id ? db.recipes.get(id) : undefined), [id])
}
