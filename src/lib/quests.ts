import { addDays, format, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { MAX_PENALTY_DAYS, QUEST_STREAK_DAYS } from '../config/xp'
import { db } from '../db/db'
import { getSetting, setSetting } from '../db/settings'
import { logicalDay } from './day'
import { currentDay, logEvent } from './events'
import { penaltyTitle, questStatus } from './questCheck'
import { onNewDay } from './startup'
import { calcStreak } from './streak'

async function statusFor(day: string) {
  const dayStartHour = await getSetting('dayStartHour')
  const events = await db.events.where('day').equals(day).toArray()
  const habits = await db.habits.filter((h) => !h.archived).toArray()
  const habitIds = habits.filter((h) => logicalDay(new Date(h.createdAt), dayStartHour) <= day).map((h) => h.id)
  const since = await getSetting('nutritionSince')
  const withStudy = (await db.subjects.filter((s) => !s.archived).toArray()).some(
    (s) => logicalDay(new Date(s.createdAt), dayStartHour) <= day,
  )
  return { events, quests: questStatus(events, habitIds, !!since && day >= since, withStudy) }
}

onNewDay(async (missed, today) => {
  const minDay = format(addDays(parseISO(today), -MAX_PENALTY_DAYS), 'yyyy-MM-dd')
  const open = await db.quests.filter((q) => !q.evaluated && q.day < today).toArray()
  const days = [...new Set([...open.map((q) => q.day), ...missed])].filter((d) => d >= minDay && d < today).sort()

  let failed = 0
  for (const day of days) {
    for (const q of (await statusFor(day)).quests) {
      if (q.done) continue
      await logEvent('quest_failed', { day, quest: q.id })
      failed++
    }
  }

  await db.quests.bulkPut([
    ...open.map((q) => ({ ...q, evaluated: true })),
    ...missed.map((day) => ({ day, evaluated: true })),
  ])
  const existing = await db.quests.get(today)
  await db.quests.put({
    ...existing,
    day: today,
    penalty: failed ? { title: penaltyTitle(today), failed } : existing?.penalty,
  })
})

export async function ensureTodayQuests() {
  const day = await currentDay()
  if (!(await db.quests.get(day))) await db.quests.add({ day })
  if (!(await getSetting('nutritionSince'))) await setSetting('nutritionSince', day)
}

let syncing = false

export async function syncQuestBonus() {
  if (syncing) return
  syncing = true
  try {
    const day = await currentDay()
    const { events, quests } = await statusFor(day)
    const bonus = events.find((e) => e.type === 'quests_completed')
    const allDone = quests.length > 0 && quests.every((q) => q.done)
    if (allDone && !bonus) await logEvent('quests_completed')
    if (!allDone && bonus) await db.events.delete(bonus.id)

    const streakBonus = events.find((e) => e.type === 'quest_streak')
    const completeDays = (await db.events.where('type').equals('quests_completed').toArray()).map((e) => e.day)
    const streak = allDone ? calcStreak(completeDays, day).current : 0
    const earned = streak > 0 && streak % QUEST_STREAK_DAYS === 0
    if (earned && !streakBonus) await logEvent('quest_streak', { days: streak })
    if (!earned && streakBonus) await db.events.delete(streakBonus.id)
  } finally {
    syncing = false
  }
}

export async function togglePenalty() {
  const day = await currentDay()
  const record = await db.quests.get(day)
  if (!record?.penalty) return
  const done = await db.events.where('[type+day]').equals(['penalty_done', day]).first()
  if (done) await db.events.delete(done.id)
  else await logEvent('penalty_done', { failed: record.penalty.failed })
}

export function useQuests() {
  return useLiveQuery(async () => {
    const day = await currentDay()
    const { events, quests } = await statusFor(day)
    const record = await db.quests.get(day)
    const penalty = record?.penalty && {
      ...record.penalty,
      done: events.some((e) => e.type === 'penalty_done'),
    }
    return { day, quests, penalty }
  })
}
