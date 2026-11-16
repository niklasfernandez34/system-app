import type { WorkoutEntry } from '../db/db'
import { calcStreak } from './streak'

type Workout = { finishedAt: number; entries: WorkoutEntry[] }
type DayEvent = { type: string; day: string; data?: Record<string, unknown> }

export function bestSet(entries: WorkoutEntry[], exerciseId: number) {
  let best = 0
  for (const e of entries) {
    if (e.exerciseId !== exerciseId) continue
    for (const s of e.sets) if (s.done) best = Math.max(best, s.weight * s.reps)
  }
  return best
}

export function sportCheck(baseline: number | null, workoutsSince: Workout[], exerciseId: number, increase: number) {
  let base = baseline ?? 0
  let current = 0
  for (const w of [...workoutsSince].sort((a, b) => a.finishedAt - b.finishedAt)) {
    const b = bestSet(w.entries, exerciseId)
    if (!b) continue
    if (!base) base = b
    else current = Math.max(current, b)
  }
  const target = base ? Math.round(base * (1 + increase) * 100) / 100 : 0
  return { baseline: base, current, target, passed: base > 0 && current >= target }
}

export function questDaysSince(events: DayEvent[], startDay: string) {
  return new Set(events.filter((e) => e.type === 'quests_completed' && e.day >= startDay).map((e) => e.day)).size
}

export function longestHabitStreak(events: DayEvent[], startDay: string, today: string) {
  const byHabit = new Map<unknown, string[]>()
  for (const e of events) {
    if (e.type !== 'habit_done' || e.day < startDay) continue
    const id = e.data?.habitId
    byHabit.set(id, [...(byHabit.get(id) ?? []), e.day])
  }
  return Math.max(0, ...[...byHabit.values()].map((days) => calcStreak(days, today).longest))
}
