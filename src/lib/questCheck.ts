import { differenceInCalendarDays, parseISO } from 'date-fns'
import { PENALTY_QUESTS, QUESTS, type QuestId } from '../config/quests'

type DayEvent = { type: string; data?: Record<string, unknown> }

export type QuestStatus = { id: QuestId; title: string; done: boolean }

export function questStatus(dayEvents: DayEvent[], habitIds: number[], withFood = false): QuestStatus[] {
  const types = new Set(dayEvents.map((e) => e.type))
  const doneHabits = new Set(dayEvents.filter((e) => e.type === 'habit_done').map((e) => e.data?.habitId))
  return QUESTS.filter((q) => (q.id !== 'habits' || habitIds.length > 0) && (q.id !== 'food' || withFood)).map((q) => ({
    id: q.id,
    title: q.title,
    done:
      q.id === 'habits'
        ? habitIds.every((id) => doneHabits.has(id))
        : (q.anyOf as readonly string[]).some((t) => types.has(t)),
  }))
}

export function penaltyTitle(day: string) {
  const n = differenceInCalendarDays(parseISO(day), parseISO('2026-01-01'))
  return PENALTY_QUESTS[((n % PENALTY_QUESTS.length) + PENALTY_QUESTS.length) % PENALTY_QUESTS.length]
}
