import type { PlanItem, WorkoutEntry } from '../db/db'

export function allSetsDone(entry: WorkoutEntry) {
  return entry.sets.length > 0 && entry.sets.every((s) => s.done && s.reps >= entry.targetReps)
}

export function workingWeight(entry: WorkoutEntry) {
  const done = entry.sets.filter((s) => s.done)
  return done.length ? Math.max(...done.map((s) => s.weight)) : 0
}

export function suggestWeight(item: PlanItem, last: WorkoutEntry | undefined, increment: number) {
  if (!last) return item.weight
  const w = workingWeight(last)
  if (w <= 0) return item.weight
  return allSetsDone(last) ? Math.round((w + increment) * 100) / 100 : w
}
