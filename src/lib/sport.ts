import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PlanRecord, type WorkoutEntry, type WorkoutRecord } from '../db/db'
import { getSetting } from '../db/settings'
import { currentDay, logEvent } from './events'
import { bestOf, detectPRs } from './pr'
import { suggestWeight, workingWeight } from './progression'

export function addExercise(name: string, muscle: string, equipment?: string) {
  return db.exercises.add({ name, muscle, equipment, createdAt: Date.now() })
}

export function useExercises() {
  return useLiveQuery(() => db.exercises.orderBy('name').toArray())
}

export function useExerciseNames() {
  return useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e.name])))
}

export async function savePlan(plan: Omit<PlanRecord, 'id' | 'order'> & { id?: number }) {
  if (plan.id) return db.plans.update(plan.id, { name: plan.name, items: plan.items })
  const last = await db.plans.orderBy('order').last()
  return db.plans.add({ name: plan.name, items: plan.items, order: (last?.order ?? 0) + 1 })
}

export function archivePlan(id: number) {
  return db.plans.update(id, { archived: true })
}

export function usePlans() {
  return useLiveQuery(async () => (await db.plans.orderBy('order').toArray()).filter((p) => !p.archived))
}

export function usePlan(id: number | undefined) {
  return useLiveQuery(() => (id ? db.plans.get(id) : undefined), [id])
}

function finished() {
  return db.workouts.where('finishedAt').above(0)
}

async function lastEntry(exerciseId: number) {
  const workouts = await finished().reverse().sortBy('finishedAt')
  for (const w of workouts) {
    const e = w.entries.find((x) => x.exerciseId === exerciseId)
    if (e) return e
  }
}

export function getRunningWorkout() {
  return db.workouts.where('finishedAt').equals(0).first()
}

export async function startWorkout(planId: number) {
  const running = await getRunningWorkout()
  if (running) return running.id
  const plan = await db.plans.get(planId)
  if (!plan) throw new Error('Plan nicht gefunden.')
  const increment = await getSetting('weightIncrement')
  const entries: WorkoutEntry[] = []
  for (const item of plan.items) {
    const last = await lastEntry(item.exerciseId)
    const weight = suggestWeight(item, last, increment)
    entries.push({
      exerciseId: item.exerciseId,
      targetReps: item.reps,
      lastWeight: last ? workingWeight(last) || undefined : undefined,
      sets: Array.from({ length: item.sets }, () => ({ weight, reps: item.reps, done: false })),
    })
  }
  return db.workouts.add({
    planId,
    day: await currentDay(),
    startedAt: Date.now(),
    finishedAt: 0,
    entries,
  } as WorkoutRecord)
}

export function useRunningWorkout() {
  return useLiveQuery(async () => (await getRunningWorkout()) ?? null)
}

export function updateWorkout(id: number, changes: Partial<Pick<WorkoutRecord, 'entries' | 'restEndsAt'>>) {
  return db.workouts.update(id, changes)
}

export function cancelWorkout(id: number) {
  return db.workouts.delete(id)
}

export async function finishWorkout(id: number) {
  const workout = await db.workouts.get(id)
  if (!workout) return []
  const history = (await finished().toArray()).flatMap((w) => w.entries)
  const entries = workout.entries.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
  const prs = detectPRs(history, entries)
  const now = new Date()
  const day = await currentDay(now)
  await db.workouts.update(id, { finishedAt: now.getTime(), day, restEndsAt: undefined })
  const sets = entries.reduce((n, e) => n + e.sets.length, 0)
  const volume = entries.reduce((v, e) => v + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0)
  await logEvent('workout_done', { workoutId: id, planId: workout.planId, sets, volume }, now)
  for (const pr of prs) await logEvent('pr_set', { ...pr, workoutId: id }, now)
  return prs
}

export function useRecentWorkouts(limit = 5) {
  return useLiveQuery(() => finished().reverse().limit(limit).sortBy('finishedAt'), [limit])
}

export function useBests() {
  return useLiveQuery(async () => bestOf((await finished().toArray()).flatMap((w) => w.entries)))
}

export function useTrainedToday() {
  return useLiveQuery(async () => {
    const day = await currentDay()
    return (await db.events.where('[type+day]').equals(['workout_done', day]).count()) > 0
  })
}

export const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })

export function usePlanNames() {
  return useLiveQuery(async () => new Map((await db.plans.toArray()).map((p) => [p.id, p.name])))
}

export function modifyEntries(id: number, fn: (entries: WorkoutEntry[]) => WorkoutEntry[], restEndsAt?: number) {
  return db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(id)
    if (!w) return
    await db.workouts.update(id, { entries: fn(w.entries), ...(restEndsAt ? { restEndsAt } : {}) })
  })
}
