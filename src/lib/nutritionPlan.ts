import { addDays, format, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getSetting, setSetting } from '../db/settings'
import { CHECK_DAYS, checkPlan, weightTrend, type NutritionPlan, type PlanCheck, type PlanGoals } from './calorieCalc'
import { currentDay } from './events'
import { mealTotals, syncNutrition } from './nutrition'

const plus = (day: string, n: number) => format(addDays(parseISO(day), n), 'yyyy-MM-dd')

async function weights() {
  return (await db.body.orderBy('day').toArray())
    .filter((b) => b.weight !== undefined)
    .map((b) => ({ day: b.day, weight: b.weight! }))
}

export function useLatestWeight() {
  return useLiveQuery(async () => (await weights()).at(-1)?.weight ?? null)
}

async function setGoals(goals: PlanGoals) {
  await setSetting('kcalGoal', goals.kcal)
  await setSetting('proteinGoal', goals.protein)
  await setSetting('carbsGoal', goals.carbs)
  await setSetting('fatGoal', goals.fat)
  await setSetting('waterGoal', goals.water)
}

export async function applyPlan(plan: Omit<NutritionPlan, 'calculatedDay' | 'nextCheckDay'>, goals: PlanGoals) {
  const today = await currentDay()
  await setGoals(goals)
  await setSetting('goalMode', plan.mode)
  await setSetting('nutritionPlan', { ...plan, calculatedDay: today, nextCheckDay: plus(today, CHECK_DAYS) })
  await syncNutrition(today)
}

export async function runPlanCheck(): Promise<PlanCheck | null> {
  const plan = await getSetting('nutritionPlan')
  if (!plan) return null
  const today = await currentDay()
  const meals = await db.meals.where('day').aboveOrEqual(plan.calculatedDay).toArray()
  const byDay = new Map<string, typeof meals>()
  for (const m of meals) byDay.set(m.day, [...(byDay.get(m.day) ?? []), m])
  const intake = [...byDay].map(([day, list]) => ({ day, kcal: mealTotals(list).kcal }))
  const current = { ...plan, kcal: await getSetting('kcalGoal'), mode: await getSetting('goalMode') }
  return checkPlan(current, await weights(), intake, today)
}

export async function acceptCheck(check: PlanCheck) {
  const plan = await getSetting('nutritionPlan')
  if (!plan) return
  const today = await currentDay()
  await setGoals(check.goals)
  await setSetting('nutritionPlan', {
    ...plan,
    tdee: Math.round(check.newTdee),
    kcal: check.goals.kcal,
    calculatedDay: today,
    nextCheckDay: plus(today, CHECK_DAYS),
  })
  await syncNutrition(today)
}

export async function declineCheck() {
  const plan = await getSetting('nutritionPlan')
  if (!plan) return
  await setSetting('nutritionPlan', { ...plan, nextCheckDay: plus(await currentDay(), CHECK_DAYS) })
}

export function usePlanStatus() {
  return useLiveQuery(async () => {
    const plan = await getSetting('nutritionPlan')
    if (!plan) return null
    const since = (await weights()).filter((w) => w.day >= plan.calculatedDay)
    const trend = since.length >= 3 ? weightTrend(since) : null
    return { plan, trend: trend?.perWeek ?? null }
  })
}
