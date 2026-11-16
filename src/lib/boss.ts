import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { BossRecord, WorkoutEntry } from '../db/db'

export function bossBest(workouts: { entries: WorkoutEntry[] }[], exerciseId: number, reps: number) {
  let best = 0
  for (const w of workouts)
    for (const e of w.entries) {
      if (e.exerciseId !== exerciseId) continue
      for (const s of e.sets) if (s.done && s.reps >= reps) best = Math.max(best, s.weight)
    }
  return best
}

export type DayValues = { kcal: number; protein: number; water: number; logged: boolean }
type NutritionBoss = Pick<BossRecord, 'metric' | 'direction' | 'target' | 'days' | 'startDay' | 'deadline'>

export function nutritionDayMet(boss: NutritionBoss, v: DayValues | undefined) {
  if (!v || !boss.metric) return false
  const value = v[boss.metric]
  return boss.direction === 'max' ? v.logged && value <= boss.target : value >= boss.target
}

export function nutritionBossStatus(boss: NutritionBoss, values: Map<string, DayValues>, today: string) {
  const need = boss.days ?? 1
  const start = boss.startDay ?? ''
  const isMax = boss.direction === 'max'
  const inWindow = (day: string) => day >= start && day <= boss.deadline
  const done = [...values].filter(([day, v]) => inWindow(day) && (!isMax || day < today) && nutritionDayMet(boss, v)).length
  const remaining = Math.max(0, differenceInCalendarDays(parseISO(boss.deadline), parseISO(today)) + 1)
  const todayDone = !isMax && inWindow(today) && nutritionDayMet(boss, values.get(today))
  const left = remaining - (todayDone ? 1 : 0)
  return { done, need, won: done >= need, impossible: done + left < need }
}

export function examOutcome(boss: Pick<BossRecord, 'target' | 'result'>) {
  if (!boss.result) return null
  if (!boss.result.passed) return 'lost'
  if (!boss.target) return 'won'
  return boss.result.grade !== undefined && boss.result.grade <= boss.target ? 'won' : 'lost'
}

export const GRADES = [1, 1.3, 1.7, 2, 2.3, 2.7, 3, 3.3, 3.7, 4] as const
export const gradeLabel = (g: number) => g.toFixed(1).replace('.', ',')
