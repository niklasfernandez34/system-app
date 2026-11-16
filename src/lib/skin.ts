import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SkinRoutine } from '../db/db'
import { getSetting } from '../db/settings'
import { logicalDay } from './day'
import { currentDay, logEvent } from './events'

export const ROUTINES: { id: SkinRoutine; label: string }[] = [
  { id: 'morning', label: 'Morgenroutine' },
  { id: 'evening', label: 'Abendroutine' },
]

export async function addStep(routine: SkinRoutine, name: string) {
  const last = await db.skinSteps.where('routine').equals(routine).sortBy('order')
  const id = await db.skinSteps.add({ routine, name, order: (last.at(-1)?.order ?? 0) + 1, createdAt: Date.now() })
  await syncRoutineDone(routine)
  return id
}

export async function updateStep(id: number, changes: { name?: string; archived?: boolean }) {
  await db.skinSteps.update(id, changes)
  const step = await db.skinSteps.get(id)
  if (step) await syncRoutineDone(step.routine)
}

export async function moveStep(id: number, dir: -1 | 1) {
  const step = await db.skinSteps.get(id)
  if (!step) return
  const list = (await db.skinSteps.where('routine').equals(step.routine).sortBy('order')).filter((s) => !s.archived)
  const i = list.findIndex((s) => s.id === id)
  const other = list[i + dir]
  if (!other) return
  await db.skinSteps.update(step.id, { order: other.order })
  await db.skinSteps.update(other.id, { order: step.order })
}

async function activeSteps(routine: SkinRoutine, day: string) {
  const hour = await getSetting('dayStartHour')
  return (await db.skinSteps.where('routine').equals(routine).sortBy('order')).filter(
    (s) => !s.archived && logicalDay(new Date(s.createdAt), hour) <= day,
  )
}

export async function syncRoutineDone(routine: SkinRoutine, day?: string) {
  day ??= await currentDay()
  const steps = await activeSteps(routine, day)
  const events = await db.events.where('day').equals(day).toArray()
  const done = new Set(events.filter((e) => e.type === 'skin_step_done').map((e) => e.data?.stepId))
  const complete = steps.length > 0 && steps.every((s) => done.has(s.id))
  const marker = events.find((e) => e.type === 'skin_routine_done' && e.data?.routine === routine)
  if (complete && !marker) await logEvent('skin_routine_done', { routine })
  if (!complete && marker) await db.events.delete(marker.id)
}

export async function toggleStep(stepId: number, routine: SkinRoutine) {
  const day = await currentDay()
  const done = await db.events
    .where('[type+day]')
    .equals(['skin_step_done', day])
    .filter((e) => e.data?.stepId === stepId)
    .first()
  if (done) await db.events.delete(done.id)
  else await logEvent('skin_step_done', { stepId, routine })
  await syncRoutineDone(routine, day)
}

export function useRoutines() {
  return useLiveQuery(async () => {
    const day = await currentDay()
    const steps = await db.skinSteps.orderBy('order').toArray()
    const events = await db.events.where('day').equals(day).toArray()
    const done = new Set(events.filter((e) => e.type === 'skin_step_done').map((e) => e.data?.stepId))
    const complete = new Set(events.filter((e) => e.type === 'skin_routine_done').map((e) => e.data?.routine))
    return ROUTINES.map((r) => ({
      ...r,
      steps: steps.filter((s) => s.routine === r.id && !s.archived).map((s) => ({ ...s, done: done.has(s.id) })),
      archived: steps.filter((s) => s.routine === r.id && s.archived),
      complete: complete.has(r.id),
    }))
  })
}

export async function rateSkin(value: number) {
  const day = await currentDay()
  const old = await db.events.where('[type+day]').equals(['skin_rated', day]).toArray()
  await db.events.bulkDelete(old.map((e) => e.id))
  await logEvent('skin_rated', { value })
}

export function useSkinRating() {
  return useLiveQuery(async () => {
    const day = await currentDay()
    const e = await db.events.where('[type+day]').equals(['skin_rated', day]).last()
    return Number(e?.data?.value ?? 0)
  })
}

export async function addSkinPhoto(blob: Blob) {
  const day = await currentDay()
  const id = await db.photos.add({ kind: 'skin', createdAt: Date.now(), blob, day })
  const today = await db.events.where('[type+day]').equals(['skin_photo', day]).count()
  if (!today) await logEvent('skin_photo', { photoId: id })
}

export function useSkinPhotos() {
  return useLiveQuery(() => db.photos.where('kind').equals('skin').reverse().sortBy('createdAt'))
}
