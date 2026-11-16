import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BossRecord } from '../db/db'
import { bossBest, nutritionBossStatus, type DayValues } from './boss'
import { mealTotals } from './nutrition'
import { currentDay, logEvent } from './events'
import { onNewDay } from './startup'

export function addBoss(boss: Pick<BossRecord, 'exerciseId' | 'target' | 'reps' | 'deadline'>) {
  return db.bosses.add({ ...boss, kind: 'lift', createdAt: Date.now(), status: 'active' } as BossRecord)
}

export async function addNutritionBoss(boss: Pick<BossRecord, 'metric' | 'direction' | 'target' | 'days' | 'deadline'>) {
  return db.bosses.add({
    ...boss,
    kind: 'nutrition',
    exerciseId: 0,
    reps: 0,
    startDay: await currentDay(),
    createdAt: Date.now(),
    status: 'active',
  } as BossRecord)
}

async function dayValues(from: string, to: string) {
  const out = new Map<string, DayValues>()
  const meals = await db.meals.where('day').between(from, to, true, true).toArray()
  for (const day of new Set(meals.map((m) => m.day))) {
    const t = mealTotals(meals.filter((m) => m.day === day))
    out.set(day, { kcal: t.kcal, protein: t.protein, water: 0, logged: true })
  }
  for (const w of await db.water.where('day').between(from, to, true, true).toArray()) {
    out.set(w.day, { ...(out.get(w.day) ?? { kcal: 0, protein: 0, logged: false }), water: w.ml })
  }
  return out
}

async function nutritionStatus(boss: BossRecord, today: string) {
  return nutritionBossStatus(boss, await dayValues(boss.startDay ?? today, boss.deadline), today)
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
  const won: { id: number; attr: string }[] = []
  if (checking) return won
  checking = true
  try {
    const today = await currentDay()
    for (const boss of await db.bosses.where('status').equals('active').toArray()) {
      if (boss.kind === 'nutrition') {
        if (!(await nutritionStatus(boss, today)).won) continue
      } else {
        if (boss.deadline < today) continue
        if ((await bestFor(boss)) < boss.target) continue
      }
      await db.bosses.update(boss.id, { status: 'won' })
      await logEvent('boss_defeated', boss.kind === 'nutrition' ? { bossId: boss.id, attr: 'vit' } : { bossId: boss.id })
      won.push({ id: boss.id, attr: boss.kind === 'nutrition' ? 'Vitalität' : 'Stärke' })
    }
  } finally {
    checking = false
  }
  return won
}

onNewDay(async (_missed, today) => {
  await checkBosses()
  for (const boss of await db.bosses.where('status').equals('active').toArray()) {
    const over = boss.kind === 'nutrition' ? (await nutritionStatus(boss, today)).impossible : boss.deadline < today
    if (!over) continue
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
      bosses.map(async (b) => {
        const daysLeft = differenceInCalendarDays(parseISO(b.deadline), parseISO(today))
        if (b.kind === 'nutrition') {
          const st = b.status === 'active' ? await nutritionStatus(b, today) : null
          return { ...b, name: bossTitle(b), best: st?.done ?? 0, goal: b.days ?? 1, daysLeft }
        }
        return { ...b, name: names.get(b.exerciseId) ?? 'Übung', best: await bestFor(b), goal: b.target, daysLeft }
      }),
    )
    return list.sort((a, b) => a.deadline.localeCompare(b.deadline))
  })
}

const METRIC = { kcal: ['kcal', 'Kalorien'], protein: ['g Eiweiß', 'Eiweiß'], water: ['ml Wasser', 'Wasser'] } as const

export function bossTitle(b: Pick<BossRecord, 'kind' | 'metric' | 'direction' | 'target' | 'days'>) {
  if (b.kind !== 'nutrition' || !b.metric) return ''
  const amount = Math.round(b.target).toLocaleString('de-DE')
  return `${b.days} × ${b.direction === 'max' ? 'höchstens' : 'mindestens'} ${amount} ${METRIC[b.metric][0]}`
}

export function useNutritionStamp() {
  return useLiveQuery(async () => {
    const day = await currentDay()
    const meals = await db.meals.where('day').equals(day).toArray()
    return `${day}|${meals.length}|${meals.reduce((a, m) => a + m.grams, 0)}|${(await db.water.get(day))?.ml ?? 0}`
  })
}
