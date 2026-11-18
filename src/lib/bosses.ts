import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BossRecord } from '../db/db'
import { bossBest, daysBossStatus, nutritionBossStatus, routineDays, type DayValues } from './boss'
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

export async function addRoutineBoss(boss: Pick<BossRecord, 'habitId' | 'routine' | 'days' | 'deadline'>) {
  return db.bosses.add({
    ...boss,
    kind: 'routine',
    exerciseId: 0,
    reps: 0,
    target: 0,
    startDay: await currentDay(),
    createdAt: Date.now(),
    status: 'active',
  } as BossRecord)
}

async function routineStatus(boss: BossRecord, today: string) {
  const types = boss.habitId ? ['habit_done'] : ['skin_routine_done']
  const events = await db.events.where('type').anyOf(types).filter((e) => e.day >= (boss.startDay ?? today) && e.day <= boss.deadline).toArray()
  return daysBossStatus(routineDays(events, boss), boss.days ?? 1, boss.startDay ?? today, boss.deadline, today)
}

const ATTR = { lift: ['str', 'Stärke'], nutrition: ['vit', 'Vitalität'], exam: ['int', 'Intelligenz'], routine: ['cha', 'Charisma'] } as const
const attrOf = (b: BossRecord) => (b.kind === 'routine' && b.habitId ? (['wil', 'Willenskraft'] as const) : ATTR[b.kind])

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
      if (boss.kind === 'exam') continue
      if (boss.kind === 'routine') {
        if (!(await routineStatus(boss, today)).won) continue
      } else if (boss.kind === 'nutrition') {
        if (!(await nutritionStatus(boss, today)).won) continue
      } else {
        if (boss.deadline < today) continue
        if ((await bestFor(boss)) < boss.target) continue
      }
      await db.bosses.update(boss.id, { status: 'won' })
      const [attr, attrName] = attrOf(boss)
      await logEvent('boss_defeated', boss.kind === 'lift' ? { bossId: boss.id } : { bossId: boss.id, attr })
      won.push({ id: boss.id, attr: attrName })
    }
  } finally {
    checking = false
  }
  return won
}

onNewDay(async (_missed, today) => {
  await checkBosses()
  for (const boss of await db.bosses.where('status').equals('active').toArray()) {
    if (boss.kind === 'exam') continue
    const over =
      boss.kind === 'nutrition'
        ? (await nutritionStatus(boss, today)).impossible
        : boss.kind === 'routine'
          ? (await routineStatus(boss, today)).impossible
          : boss.deadline < today
    if (!over) continue
    await db.bosses.update(boss.id, { status: 'lost' })
    await logEvent('boss_failed', { bossId: boss.id })
  }
})

export function useBosses() {
  return useLiveQuery(async () => {
    const today = await currentDay()
    const names = new Map((await db.exercises.toArray()).map((e) => [e.id, e.name]))
    const habits = new Map((await db.habits.toArray()).map((h) => [h.id, h.name]))
    const bosses = await db.bosses.toArray()
    const list = await Promise.all(
      bosses.map(async (b) => {
        const daysLeft = differenceInCalendarDays(parseISO(b.deadline), parseISO(today))
        if (b.kind === 'routine') {
          const st = b.status === 'active' ? await routineStatus(b, today) : null
          const what = b.habitId ? `Habit „${habits.get(b.habitId) ?? '?'}“` : b.routine === 'both' ? 'Morgen- + Abendroutine' : b.routine === 'morning' ? 'Morgenroutine' : 'Abendroutine'
          return { ...b, name: `${b.days} × ${what}`, best: st?.done ?? 0, goal: b.days ?? 1, daysLeft }
        }
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
