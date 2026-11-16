import { differenceInCalendarDays, parseISO } from 'date-fns'
import { PENALTY_QUESTS, QUESTS, type QuestId } from '../config/quests'

type DayEvent = { type: string; data?: Record<string, unknown> }

export type QuestStatus = { id: QuestId; title: string; done: boolean }

export function questStatus(
  dayEvents: DayEvent[],
  habitIds: number[],
  withFood = false,
  withStudy = false,
  skinRoutines: string[] = [],
): QuestStatus[] {
  const types = new Set(dayEvents.map((e) => e.type))
  const doneHabits = new Set(dayEvents.filter((e) => e.type === 'habit_done').map((e) => e.data?.habitId))
  const doneRoutines = new Set(dayEvents.filter((e) => e.type === 'skin_routine_done').map((e) => e.data?.routine))
  return QUESTS.filter((q) => (q.id !== 'habits' || habitIds.length > 0) && (q.id !== 'food' || withFood) && (q.id !== 'study' || withStudy) && (q.id !== 'skin' || skinRoutines.length > 0)).map((q) => ({
    id: q.id,
    title: q.title,
    done:
      q.id === 'habits'
        ? habitIds.every((id) => doneHabits.has(id))
        : q.id === 'skin'
          ? skinRoutines.every((r) => doneRoutines.has(r))
          : (q.anyOf as readonly string[]).some((t) => types.has(t)),
  }))
}

export function penaltyTitle(day: string) {
  const n = differenceInCalendarDays(parseISO(day), parseISO('2026-01-01'))
  return PENALTY_QUESTS[((n % PENALTY_QUESTS.length) + PENALTY_QUESTS.length) % PENALTY_QUESTS.length]
}
