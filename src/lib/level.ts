import {
  ATTRIBUTE_BASE,
  ATTRIBUTE_OF,
  ATTRIBUTE_XP_PER_POINT,
  ATTRIBUTES,
  RANKS,
  STAGES_PER_RANK,
  XP,
  type Attribute,
  type EventType,
} from '../config/xp'

type LogEvent = { type: string; data?: Record<string, unknown> }

export function xpOf(e: LogEvent): number {
  if (e.type === 'penalty_done') return Number(e.data?.failed ?? 0) * -XP.quest_failed
  return XP[e.type as EventType] ?? 0
}

export function totalXp(events: LogEvent[]) {
  return Math.max(0, events.reduce((sum, e) => sum + xpOf(e), 0))
}

export const rankIndexOf = (events: LogEvent[]) =>
  Math.min(RANKS.length - 1, events.filter((e) => e.type === 'rank_up').length)

export function rankProgress(xp: number, rankIndex: number) {
  const start = RANKS.slice(0, rankIndex).reduce((sum, r) => sum + r.xp, 0)
  const { rank, xp: span } = RANKS[rankIndex]
  const isLast = rankIndex === RANKS.length - 1
  const stageSize = span / STAGES_PER_RANK
  const inRank = Math.max(0, xp - start)
  const raw = Math.floor(inRank / stageSize) + 1
  const stage = isLast ? raw : Math.min(STAGES_PER_RANK, raw)
  const into = Math.min(stageSize, inRank - (stage - 1) * stageSize)
  return { rank, stage, into, stageSize, ready: !isLast && inRank >= span }
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
export const roman = (n: number) => ROMAN[n - 1] ?? String(n)

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
