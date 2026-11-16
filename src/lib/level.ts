import {
  ATTRIBUTE_BASE,
  ATTRIBUTE_OF,
  ATTRIBUTE_XP_PER_POINT,
  ATTRIBUTES,
  LEVEL_BASE_XP,
  LEVEL_STEP_XP,
  RANKS,
  XP,
  type Attribute,
  type EventType,
  type Rank,
} from '../config/xp'

type LogEvent = { type: string; data?: Record<string, unknown> }

export function xpOf(e: LogEvent): number {
  if (e.type === 'penalty_done') return Number(e.data?.failed ?? 0) * -XP.quest_failed
  return XP[e.type as EventType] ?? 0
}

export function totalXp(events: LogEvent[]) {
  return Math.max(0, events.reduce((sum, e) => sum + xpOf(e), 0))
}

export const xpForNextLevel = (level: number) => LEVEL_BASE_XP + LEVEL_STEP_XP * (level - 1)

export function rankOf(level: number): Rank {
  let rank: Rank = RANKS[0].rank
  for (const r of RANKS) if (level >= r.from) rank = r.rank
  return rank
}

export function levelFromXp(xp: number) {
  let level = 1
  let rest = Math.max(0, xp)
  while (rest >= xpForNextLevel(level)) {
    rest -= xpForNextLevel(level)
    level++
  }
  return { level, rank: rankOf(level), into: rest, need: xpForNextLevel(level) }
}

export function attributes(events: LogEvent[]) {
  const xp = Object.fromEntries(Object.keys(ATTRIBUTES).map((a) => [a, 0])) as Record<Attribute, number>
  for (const e of events) {
    const attr = ATTRIBUTE_OF[e.type as EventType]
    if (attr) xp[attr] += xpOf(e)
  }
  return Object.fromEntries(
    Object.entries(xp).map(([a, v]) => [a, ATTRIBUTE_BASE + Math.floor(v / ATTRIBUTE_XP_PER_POINT)]),
  ) as Record<Attribute, number>
}
