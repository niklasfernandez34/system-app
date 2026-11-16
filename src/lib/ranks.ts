import { useLiveQuery } from 'dexie-react-hooks'
import { RANKS, SPORT_CONDITIONS } from '../config/xp'
import { db, type RankRecord } from '../db/db'
import { fmt } from './sport'
import { currentDay, logEvent } from './events'
import { attributes, rankIndexOf, rankProgress, totalXp } from './level'
import { bestSet, longestHabitStreak, questDaysSince, sportCheck } from './rankExam'

export type Condition = { label: string; detail: string; value: number; target: number; passed: boolean }

async function planExerciseIds() {
  const plans = (await db.plans.toArray()).filter((p) => !p.archived)
  return [...new Set(plans.flatMap((p) => p.items.map((i) => i.exerciseId)))]
}

async function baselineFor(exerciseId: number, before: number) {
  const workouts = await db.workouts.where('finishedAt').between(1, before).reverse().sortBy('finishedAt')
  for (const w of workouts) {
    const b = bestSet(w.entries, exerciseId)
    if (b) return b
  }
  return null
}

const shuffle = <T,>(list: T[]) => [...list].sort(() => Math.random() - 0.5)

let ensuring = false

export async function ensureRankRecord() {
  if (ensuring) return
  ensuring = true
  try {
    const rankIndex = rankIndexOf(await db.events.where('type').equals('rank_up').toArray())
    if (rankIndex === RANKS.length - 1) return
    const rank = RANKS[rankIndex].rank
    const record: RankRecord = (await db.ranks.get(rank)) ?? {
      rank,
      startedAt: Date.now(),
      startDay: await currentDay(),
      exercises: [],
    }
    const chosen = new Set(record.exercises.map((e) => e.exerciseId))
    const free = shuffle((await planExerciseIds()).filter((id) => !chosen.has(id)))
    const picks = free.slice(0, SPORT_CONDITIONS - record.exercises.length)
    for (const exerciseId of picks) {
      record.exercises.push({ exerciseId, baseline: await baselineFor(exerciseId, record.startedAt) })
    }
    const existing = await db.ranks.get(rank)
    if (!existing || picks.length) await db.ranks.put(record)
  } finally {
    ensuring = false
  }
}

async function loadState() {
  const events = await db.events.toArray()
  const xp = totalXp(events)
  const rankIndex = rankIndexOf(events)
  const progress = rankProgress(xp, rankIndex)
  const base = { xp, rankIndex, ...progress, attributes: attributes(events) }
  const cfg = RANKS[rankIndex]
  if (rankIndex === RANKS.length - 1) return { ...base, conditions: [] as Condition[], passed: false }

  const record = await db.ranks.get(cfg.rank)
  if (!record) return { ...base, conditions: [] as Condition[], passed: false }

  const today = await currentDay()
  const workouts = await db.workouts.where('finishedAt').above(record.startedAt).toArray()
  const names = new Map((await db.exercises.toArray()).map((e) => [e.id, e.name]))
  const pct = `+${fmt(cfg.increase * 100)} %`

  const conditions: Condition[] = []
  for (let i = 0; i < SPORT_CONDITIONS; i++) {
    const ex = record.exercises[i]
    if (!ex) {
      conditions.push({ label: 'Übung fehlt', detail: 'Lege einen Trainingsplan an.', value: 0, target: 1, passed: false })
      continue
    }
    const c = sportCheck(ex.baseline, workouts, ex.exerciseId, cfg.increase)
    conditions.push({
      label: `${names.get(ex.exerciseId) ?? 'Übung'} ${pct}`,
      detail: c.baseline
        ? `Start ${fmt(c.baseline)} → Ziel ${fmt(c.target)} (kg × WDH, bester Satz)`
        : 'Noch kein Startwert. Das nächste Training zählt als Start.',
      value: c.current,
      target: c.target || 1,
      passed: c.passed,
    })
  }
  const questDays = questDaysSince(events, record.startDay)
  conditions.push({
    label: 'Alle Quests erledigt',
    detail: `An ${cfg.questDays} Tagen in diesem Rang`,
    value: questDays,
    target: cfg.questDays,
    passed: questDays >= cfg.questDays,
  })
  const streak = longestHabitStreak(events, record.startDay, today)
  conditions.push({
    label: 'Habit-Serie',
    detail: `Ein Habit ${cfg.habitStreak} Tage am Stück`,
    value: streak,
    target: cfg.habitStreak,
    passed: streak >= cfg.habitStreak,
  })
  return { ...base, conditions, passed: conditions.every((c) => c.passed) }
}

export function useRankState() {
  return useLiveQuery(loadState)
}

let rankingUp = false

export async function tryRankUp() {
  if (rankingUp) return
  rankingUp = true
  try {
    const s = await loadState()
    if (!s.ready || !s.passed) return
    await logEvent('rank_up', { from: s.rank, to: RANKS[s.rankIndex + 1].rank })
  } finally {
    rankingUp = false
  }
  await ensureRankRecord()
}
