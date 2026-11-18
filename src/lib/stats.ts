import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns'
import { de } from 'date-fns/locale'
import type { MealRecord } from '../db/db'
import { xpOf } from './level'
import { mealTotals } from './nutrition'

export type MetricKey =
  | 'xp'
  | 'quests'
  | 'workouts'
  | 'volume'
  | 'prs'
  | 'kcal'
  | 'protein'
  | 'water'
  | 'weight'
  | 'sleepHours'
  | 'mood'
  | 'energy'
  | 'skinRoutines'
  | 'skinRating'
  | 'habits'

export type Metric = { key: MetricKey; label: string; unit: string; kind: 'sum' | 'avg'; digits?: number }

export const METRICS: Record<MetricKey, Metric> = {
  xp: { key: 'xp', label: 'XP', unit: 'XP', kind: 'sum' },
  quests: { key: 'quests', label: 'Quest-Tage komplett', unit: 'Tage', kind: 'sum' },
  workouts: { key: 'workouts', label: 'Trainings', unit: '', kind: 'sum' },
  volume: { key: 'volume', label: 'Volumen', unit: 'kg', kind: 'sum' },
  prs: { key: 'prs', label: 'PRs', unit: '', kind: 'sum' },
  kcal: { key: 'kcal', label: 'Kalorien', unit: 'kcal', kind: 'avg' },
  protein: { key: 'protein', label: 'Eiweiß', unit: 'g', kind: 'avg' },
  water: { key: 'water', label: 'Wasser', unit: 'ml', kind: 'avg' },
  weight: { key: 'weight', label: 'Gewicht', unit: 'kg', kind: 'avg', digits: 1 },
  sleepHours: { key: 'sleepHours', label: 'Schlaf', unit: 'h', kind: 'avg', digits: 1 },
  mood: { key: 'mood', label: 'Stimmung', unit: '/ 5', kind: 'avg', digits: 1 },
  energy: { key: 'energy', label: 'Energie', unit: '/ 5', kind: 'avg', digits: 1 },
  skinRoutines: { key: 'skinRoutines', label: 'Pflegeroutinen', unit: '', kind: 'sum' },
  skinRating: { key: 'skinRating', label: 'Hautzustand', unit: '/ 5', kind: 'avg', digits: 1 },
  habits: { key: 'habits', label: 'Habits erledigt', unit: '', kind: 'sum' },
}

export const AREAS = {
  XP: ['xp', 'quests'],
  Sport: ['workouts', 'volume', 'prs'],
  Ernährung: ['kcal', 'protein', 'water'],
  Körper: ['weight'],
  Tagebuch: ['sleepHours', 'mood', 'energy'],
  Haut: ['skinRoutines', 'skinRating'],
  Habits: ['habits'],
} as const satisfies Record<string, readonly MetricKey[]>

export type Area = keyof typeof AREAS

export type StatsInput = {
  events: { type: string; day: string; data?: Record<string, unknown> }[]
  meals: Pick<MealRecord, 'day' | 'group' | 'grams' | 'per100'>[]
  water: { day: string; ml: number }[]
  body: { day: string; weight?: number }[]
  journal: { day: string; sleepHours: number; mood: number; energy: number }[]
}

export type DayValues = Partial<Record<MetricKey, number>>

const COUNT: Partial<Record<string, MetricKey>> = {
  quests_completed: 'quests',
  workout_done: 'workouts',
  pr_set: 'prs',
  skin_routine_done: 'skinRoutines',
  habit_done: 'habits',
}

export function dailyValues(input: StatsInput) {
  const map = new Map<string, DayValues>()
  const at = (day: string) => map.get(day) ?? (map.set(day, {}), map.get(day)!)
  const add = (day: string, key: MetricKey, n: number) => {
    const v = at(day)
    v[key] = (v[key] ?? 0) + n
  }
  for (const e of input.events) {
    const xp = xpOf(e)
    if (xp) add(e.day, 'xp', xp)
    const count = COUNT[e.type]
    if (count) add(e.day, count, 1)
    if (e.type === 'workout_done') add(e.day, 'volume', Number(e.data?.volume ?? 0))
    if (e.type === 'skin_rated') at(e.day).skinRating = Number(e.data?.value ?? 0)
  }
  const mealsByDay = new Map<string, StatsInput['meals']>()
  for (const m of input.meals) mealsByDay.set(m.day, [...(mealsByDay.get(m.day) ?? []), m])
  for (const [day, meals] of mealsByDay) {
    const t = mealTotals(meals)
    at(day).kcal = Math.round(t.kcal)
    at(day).protein = Math.round(t.protein)
  }
  for (const w of input.water) if (w.ml > 0) at(w.day).water = w.ml
  for (const b of input.body) if (b.weight) at(b.day).weight = b.weight
  for (const j of input.journal) Object.assign(at(j.day), { sleepHours: j.sleepHours, mood: j.mood, energy: j.energy })
  return map
}

export function aggregate(daily: Map<string, DayValues>, days: string[], key: MetricKey): number | null {
  const values = days.map((d) => daily.get(d)?.[key]).filter((v): v is number => v !== undefined)
  if (METRICS[key].kind === 'sum') return values.reduce((s, v) => s + v, 0)
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null
}

export const RANGES = ['4 Wochen', '3 Monate', '1 Jahr'] as const
export type Range = (typeof RANGES)[number]
export type Bucket = { label: string; days: string[] }

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

function daysFromTo(from: Date, to: Date) {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(iso(d))
  return out
}

export function buckets(today: string, range: Range): Bucket[] {
  const end = parseISO(today)
  if (range === '4 Wochen') return daysFromTo(subDays(end, 27), end).map((d) => ({ label: format(parseISO(d), 'd.M.'), days: [d] }))
  if (range === '3 Monate') {
    const first = subWeeks(startOfWeek(end, { weekStartsOn: 1 }), 12)
    return Array.from({ length: 13 }, (_, i) => {
      const start = addDays(first, i * 7)
      const stop = addDays(start, 6)
      return { label: format(start, 'd.M.'), days: daysFromTo(start, stop > end ? end : stop) }
    })
  }
  const first = subMonths(startOfMonth(end), 11)
  return Array.from({ length: 12 }, (_, i) => {
    const start = addMonths(first, i)
    const stop = subDays(addMonths(start, 1), 1)
    return { label: format(start, 'MMM', { locale: de }), days: daysFromTo(start, stop > end ? end : stop) }
  })
}

export function series(daily: Map<string, DayValues>, list: Bucket[], key: MetricKey) {
  return list.map((b) => ({ label: b.label, value: aggregate(daily, b.days, key) }))
}

export function reviewWeek(today: string) {
  const t = parseISO(today)
  const monday = startOfWeek(t, { weekStartsOn: 1 })
  const start = t.getDay() === 0 ? monday : subWeeks(monday, 1)
  const days = daysFromTo(start, addDays(start, 6))
  const prev = daysFromTo(subWeeks(start, 1), subDays(start, 1))
  return { start: days[0], end: days[6], days, prev }
}

export const REVIEW_METRICS: MetricKey[] = [
  'xp',
  'quests',
  'workouts',
  'volume',
  'prs',
  'habits',
  'skinRoutines',
  'kcal',
  'protein',
  'sleepHours',
  'mood',
  'energy',
]

export const NEUTRAL_TREND: MetricKey[] = ['kcal', 'weight']

export function weekReview(daily: Map<string, DayValues>, week: { days: string[]; prev: string[] }) {
  return REVIEW_METRICS.map((key) => ({
    metric: METRICS[key],
    value: aggregate(daily, week.days, key),
    prev: aggregate(daily, week.prev, key),
  }))
}

export function fmtMetric(value: number | null, m: Metric) {
  if (value === null) return '–'
  const n = value.toLocaleString('de-DE', { maximumFractionDigits: m.kind === 'avg' ? (m.digits ?? 0) : 0 })
  return m.unit ? `${n} ${m.unit}` : n
}
