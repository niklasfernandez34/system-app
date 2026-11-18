import { addDays, format, parseISO } from 'date-fns'
import type { DayValues } from './stats'

export const INSIGHT_DAYS = 90
export const MIN_DAYS = 5
export const MIN_DIFF = 10

type Daily = Map<string, DayValues>

type Rule = {
  id: string
  when: string
  other: string
  what: string
  unit: string
  digits: number
  split: (d: DayValues, day: string, daily: Daily) => boolean | null
  value: (d: DayValues) => number | undefined
}

const sleep7 = (d: DayValues) => (d.sleepHours === undefined ? null : d.sleepHours >= 7)

const skinDays = (day: string, daily: Daily) => {
  let n = 0
  for (let i = 0; i < 7; i++) if (daily.get(format(addDays(parseISO(day), -i), 'yyyy-MM-dd'))?.skinRoutines) n++
  return n
}

export const RULES: Rule[] = [
  {
    id: 'sleep-volume',
    when: 'Mit 7+ h Schlaf',
    other: 'weniger Schlaf',
    what: 'Volumen pro Training',
    unit: 'kg',
    digits: 0,
    split: sleep7,
    value: (d) => (d.workouts ? (d.volume ?? 0) / d.workouts : undefined),
  },
  { id: 'sleep-mood', when: 'Mit 7+ h Schlaf', other: 'weniger Schlaf', what: 'Stimmung', unit: '/ 5', digits: 1, split: sleep7, value: (d) => d.mood },
  { id: 'sleep-energy', when: 'Mit 7+ h Schlaf', other: 'weniger Schlaf', what: 'Energie', unit: '/ 5', digits: 1, split: sleep7, value: (d) => d.energy },
  {
    id: 'training-mood',
    when: 'An Trainingstagen',
    other: 'Tage ohne Training',
    what: 'Stimmung',
    unit: '/ 5',
    digits: 1,
    split: (d) => !!d.workouts,
    value: (d) => d.mood,
  },
  {
    id: 'training-sleep',
    when: 'Nach Trainingstagen',
    other: 'Tage ohne Training',
    what: 'Schlaf',
    unit: 'h',
    digits: 1,
    split: (_d, day, daily) => !!daily.get(format(addDays(parseISO(day), -1), 'yyyy-MM-dd'))?.workouts,
    value: (d) => d.sleepHours,
  },
  {
    id: 'skin-rating',
    when: 'Mit Pflege an 5+ von 7 Tagen',
    other: 'weniger Pflege',
    what: 'Hautzustand',
    unit: '/ 5',
    digits: 1,
    split: (_d, day, daily) => skinDays(day, daily) >= 5,
    value: (d) => d.skinRating || undefined,
  },
  {
    id: 'habits-mood',
    when: 'An Tagen mit Habits',
    other: 'Tage ohne Habits',
    what: 'Stimmung',
    unit: '/ 5',
    digits: 1,
    split: (d) => !!d.habits,
    value: (d) => d.mood,
  },
]

export type Insight = { rule: Rule; a: number; b: number; nA: number; nB: number; diff: number }

const avg = (list: number[]) => list.reduce((s, v) => s + v, 0) / list.length

export function insights(daily: Daily, days: string[]) {
  const found: Insight[] = []
  let waiting = 0
  for (const rule of RULES) {
    const yes: number[] = []
    const no: number[] = []
    for (const day of days) {
      const d = daily.get(day)
      if (!d) continue
      const v = rule.value(d)
      const s = v === undefined ? null : rule.split(d, day, daily)
      if (s === null || v === undefined) continue
      ;(s ? yes : no).push(v)
    }
    if (yes.length < MIN_DAYS || no.length < MIN_DAYS) {
      waiting++
      continue
    }
    const a = avg(yes)
    const b = avg(no)
    if (b <= 0 && a <= 0) continue
    const diff = b > 0 ? ((a - b) / b) * 100 : 100
    if (Math.abs(diff) >= MIN_DIFF) found.push({ rule, a, b, nA: yes.length, nB: no.length, diff })
  }
  return { found: found.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff)), waiting }
}
