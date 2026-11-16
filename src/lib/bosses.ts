import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BossRecord } from '../db/db'
import { bossBest } from './boss'
import { currentDay, logEvent } from './events'
import { onNewDay } from './startup'

export function addBoss(boss: Pick<BossRecord, 'exerciseId' | 'target' | 'reps' | 'deadline'>) {
  return db.bosses.add({ ...boss, kind: 'lift', createdAt: Date.now(), status: 'active' } as BossRecord)
}

export function deleteBoss(id: number) {
  return db.bosses.delete(id)
}

async function bestFor(boss: BossRecord) {
  const workouts = await db.workouts.where('finishedAt').above(boss.createdAt).toArray()
  return bossBest(workouts, boss.exerciseId, boss.reps)
}

let checking = false

export async function checkBosses() {
  const won: number[] = []
  if (checking) return won
  checking = true
  try {
    const today = await currentDay()
    for (const boss of await db.bosses.where('status').equals('active').toArray()) {
      if (boss.deadline < today) continue
      if ((await bestFor(boss)) < boss.target) continue
      await db.bosses.update(boss.id, { status: 'won' })
      await logEvent('boss_defeated', { bossId: boss.id })
      won.push(boss.id)
    }
  } finally {
    checking = false
  }
  return won
}

onNewDay(async (_missed, today) => {
  await checkBosses()
  for (const boss of await db.bosses.where('status').equals('active').toArray()) {
    if (boss.deadline >= today) continue
    await db.bosses.update(boss.id, { status: 'lost' })
    await logEvent('boss_failed', { bossId: boss.id })
  }
})

export function useBosses() {
  return useLiveQuery(async () => {
    const today = await currentDay()
    const names = new Map((await db.exercises.toArray()).map((e) => [e.id, e.name]))
    const bosses = await db.bosses.toArray()
    const list = await Promise.all(
      bosses.map(async (b) => ({
        ...b,
        name: names.get(b.exerciseId) ?? 'Übung',
        best: await bestFor(b),
        daysLeft: differenceInCalendarDays(parseISO(b.deadline), parseISO(today)),
      })),
    )
    return list.sort((a, b) => a.deadline.localeCompare(b.deadline))
  })
}
