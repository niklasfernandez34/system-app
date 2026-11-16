import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export const KCAL_PER_KG = 7700
export const CHECK_DAYS = 14
export const MIN_WEIGH_INS = 4
export const MIN_LOGGED_DAYS = 10
export const RATE_TOLERANCE = 0.25
export const ADHERENCE = 0.1

export const ACTIVITY = [
  { label: 'Sitzend', hint: 'Bürojob, kaum Sport', pal: 1.2 },
  { label: 'Leicht aktiv', hint: '1–3 × Sport pro Woche', pal: 1.375 },
  { label: 'Mäßig aktiv', hint: '3–5 × Sport pro Woche', pal: 1.55 },
  { label: 'Sehr aktiv', hint: '6–7 × Sport pro Woche', pal: 1.725 },
  { label: 'Extrem aktiv', hint: 'Körperliche Arbeit und Sport', pal: 1.9 },
] as const

export type GoalMode = 'lose' | 'keep' | 'gain'
export const GOAL_MODES: { mode: GoalMode; label: string }[] = [
  { mode: 'lose', label: 'Abnehmen' },
  { mode: 'keep', label: 'Halten' },
  { mode: 'gain', label: 'Zunehmen' },
]

export type Profile = { sex: 'm' | 'f'; age: number; height: number; weight: number; activity: number }

export type NutritionPlan = {
  mode: GoalMode
  rate: number
  sex: 'm' | 'f'
  age: number
  height: number
  activity: number
  targetWeight?: number
  targetDate?: string
  tdee: number
  kcal: number
  calculatedDay: string
  nextCheckDay: string
}

export type PlanGoals = { kcal: number; protein: number; carbs: number; fat: number; water: number }

export function bmr({ sex, age, height, weight }: Profile) {
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'm' ? 5 : -161)
}

export function tdeeOf(p: Profile) {
  return bmr(p) * ACTIVITY[Math.min(ACTIVITY.length - 1, Math.max(0, p.activity))].pal
}

export function rateForTarget(weight: number, targetWeight: number, today: string, targetDate: string) {
  const weeks = differenceInCalendarDays(parseISO(targetDate), parseISO(today)) / 7
  return weeks > 0 ? (targetWeight - weight) / weeks : 0
}

export function rateWarning(rate: number, weight: number) {
  if (rate < 0 && -rate > weight * 0.01) return 'Mehr als 1 % des Körpergewichts pro Woche abzunehmen ist sehr schnell.'
  if (rate > 0.5) return 'Mehr als 0,5 kg pro Woche zuzunehmen ist meist viel Fett.'
  return ''
}

export const minKcal = (sex: 'm' | 'f') => (sex === 'm' ? 1500 : 1200)

export function goalsFor(tdee: number, rate: number, weight: number, sex: 'm' | 'f', mode: GoalMode): PlanGoals & { floored: boolean } {
  const raw = tdee + (rate * KCAL_PER_KG) / 7
  const kcal = Math.round(Math.max(minKcal(sex), raw) / 10) * 10
  const protein = Math.round(weight * (mode === 'lose' ? 2.2 : 2.0))
  const fat = Math.round(weight * 0.9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  const water = Math.round((weight * 35) / 250) * 250
  return { kcal, protein, carbs, fat, water, floored: raw < minKcal(sex) }
}

export function etaDay(weight: number, targetWeight: number, rate: number, today: string) {
  if (!rate || (targetWeight - weight) / rate <= 0) return null
  return format(addDays(parseISO(today), Math.round(((targetWeight - weight) / rate) * 7)), 'yyyy-MM-dd')
}

type Point = { day: string; weight: number }

export function weightTrend(points: Point[]) {
  if (points.length < 2) return null
  const t0 = parseISO(points[0].day)
  const xs = points.map((p) => differenceInCalendarDays(parseISO(p.day), t0))
  const ys = points.map((p) => p.weight)
  const n = points.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  if (!sxx) return null
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx
  const resid = ys.reduce((a, y, i) => a + (y - (my + slope * (xs[i] - mx))) ** 2, 0)
  const se = n > 2 ? Math.sqrt(resid / (n - 2) / sxx) : Infinity
  const last = my + slope * (xs[n - 1] - mx)
  return { perWeek: slope * 7, sePerWeek: se * 7, current: last }
}

export type PlanCheck = {
  actualRate: number
  plannedRate: number
  avgIntake: number
  newTdee: number
  weight: number
  goals: PlanGoals
}

export function checkPlan(
  plan: NutritionPlan,
  weights: Point[],
  intake: { day: string; kcal: number }[],
  today: string,
): PlanCheck | null {
  if (today < plan.nextCheckDay) return null
  const since = weights.filter((w) => w.day >= plan.calculatedDay && w.day <= today)
  if (since.length < MIN_WEIGH_INS) return null
  const span = differenceInCalendarDays(parseISO(since[since.length - 1].day), parseISO(since[0].day))
  if (span < CHECK_DAYS - 3) return null
  const trend = weightTrend(since)
  if (!trend) return null
  const diff = Math.abs(trend.perWeek - plan.rate)
  if (diff <= RATE_TOLERANCE || diff <= 2 * trend.sePerWeek) return null

  const logged = intake.filter((d) => d.day >= plan.calculatedDay && d.day < today && d.kcal > 0)
  if (logged.length < MIN_LOGGED_DAYS) return null
  const avgIntake = logged.reduce((a, d) => a + d.kcal, 0) / logged.length
  if (Math.abs(avgIntake - plan.kcal) > plan.kcal * ADHERENCE) return null

  const newTdee = avgIntake - (trend.perWeek * KCAL_PER_KG) / 7
  const goals = goalsFor(newTdee, plan.rate, trend.current, plan.sex, plan.mode)
  if (Math.abs(goals.kcal - plan.kcal) < 50) return null
  return { actualRate: trend.perWeek, plannedRate: plan.rate, avgIntake, newTdee, weight: trend.current, goals }
}

export function kcalGoalReached(kcal: number, goal: number, mode: GoalMode) {
  if (goal <= 0) return false
  if (mode === 'lose') return kcal >= goal * 0.8 && kcal <= goal
  if (mode === 'keep') return kcal >= goal * 0.9 && kcal <= goal * 1.1
  return kcal >= goal
}
