import { TITLES, type Metric } from '../config/titles'
import { rankIndexOf, totalXp } from './level'
import { longestHabitStreak } from './rankExam'
import { calcStreak } from './streak'

type LogEvent = { type: string; day: string; data?: Record<string, unknown> }

export function computeMetrics(events: LogEvent[], today: string): Record<Metric, number> {
  const count = (type: string) => events.filter((e) => e.type === type).length
  const days = (type: string) => events.filter((e) => e.type === type).map((e) => e.day)
  return {
    activeDays: new Set(events.map((e) => e.day)).size,
    workouts: count('workout_done'),
    volume: events.filter((e) => e.type === 'workout_done').reduce((v, e) => v + Number(e.data?.volume ?? 0), 0),
    prs: count('pr_set'),
    bosses: count('boss_defeated'),
    bodyLogs: count('body_logged'),
    progressPhotos: count('progress_photo'),
    checkins: count('checkin_done'),
    checkinStreak: calcStreak(days('checkin_done'), today).longest,
    journals: count('journal_written'),
    habits: count('habit_done'),
    habitStreak: longestHabitStreak(events, '', today),
    questDays: new Set(days('quests_completed')).size,
    questStreak: calcStreak(days('quests_completed'), today).longest,
    penalties: count('penalty_done'),
    notes: count('note_added'),
    rank: rankIndexOf(events),
    xp: totalXp(events),
  }
}

export function titleStatus(events: LogEvent[], today: string) {
  const metrics = computeMetrics(events, today)
  return TITLES.map((t) => ({ ...t, value: metrics[t.metric], unlocked: metrics[t.metric] >= t.threshold }))
}
