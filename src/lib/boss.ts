import type { WorkoutEntry } from '../db/db'

export function bossBest(workouts: { entries: WorkoutEntry[] }[], exerciseId: number, reps: number) {
  let best = 0
  for (const w of workouts)
    for (const e of w.entries) {
      if (e.exerciseId !== exerciseId) continue
      for (const s of e.sets) if (s.done && s.reps >= reps) best = Math.max(best, s.weight)
    }
  return best
}
