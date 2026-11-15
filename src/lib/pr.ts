import type { WorkoutEntry } from '../db/db'

export type Best = { weight: number; e1rm: number }
export type PR = { exerciseId: number; kind: 'weight' | 'e1rm'; value: number; previous: number }

export function e1rm(weight: number, reps: number) {
  if (reps <= 0 || weight <= 0) return 0
  return Math.round((reps === 1 ? weight : weight * (1 + reps / 30)) * 10) / 10
}

export function bestOf(entries: WorkoutEntry[]) {
  const best = new Map<number, Best>()
  for (const e of entries) {
    for (const s of e.sets) {
      if (!s.done || s.reps <= 0) continue
      const b = best.get(e.exerciseId) ?? { weight: 0, e1rm: 0 }
      best.set(e.exerciseId, {
        weight: Math.max(b.weight, s.weight),
        e1rm: Math.max(b.e1rm, e1rm(s.weight, s.reps)),
      })
    }
  }
  return best
}

export function detectPRs(history: WorkoutEntry[], current: WorkoutEntry[]): PR[] {
  const before = bestOf(history)
  const now = bestOf(current)
  const prs: PR[] = []
  for (const [exerciseId, b] of now) {
    const prev = before.get(exerciseId)
    if (!prev) continue
    if (b.weight > prev.weight) prs.push({ exerciseId, kind: 'weight', value: b.weight, previous: prev.weight })
    else if (b.e1rm > prev.e1rm) prs.push({ exerciseId, kind: 'e1rm', value: b.e1rm, previous: prev.e1rm })
  }
  return prs
}
