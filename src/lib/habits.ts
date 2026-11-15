import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { currentDay, logEvent } from './events'
import { calcStreak } from './streak'

export async function addHabit(name: string) {
  const last = await db.habits.orderBy('order').last()
  return db.habits.add({ name, order: (last?.order ?? 0) + 1, createdAt: Date.now() })
}

export function updateHabit(id: number, changes: { name?: string; archived?: boolean }) {
  return db.habits.update(id, changes)
}

export async function toggleHabit(habitId: number) {
  const day = await currentDay()
  const done = await db.events
    .where('[type+day]')
    .equals(['habit_done', day])
    .filter((e) => e.data?.habitId === habitId)
    .first()
  if (done) await db.events.delete(done.id)
  else await logEvent('habit_done', { habitId })
}

export function useHabits() {
  return useLiveQuery(async () => {
    const day = await currentDay()
    const habits = await db.habits.orderBy('order').toArray()
    const events = await db.events.where('type').equals('habit_done').toArray()
    const daysById = new Map<number, Set<string>>()
    for (const e of events) {
      const id = e.data?.habitId as number
      if (!daysById.has(id)) daysById.set(id, new Set())
      daysById.get(id)!.add(e.day)
    }
    return habits.map((h) => {
      const days = daysById.get(h.id) ?? new Set<string>()
      return { ...h, done: days.has(day), ...calcStreak(days, day) }
    })
  })
}
