import { addDays, format, parseISO } from 'date-fns'

export const BOX_DAYS = [0, 1, 2, 4, 8, 16] as const
export const MAX_BOX = BOX_DAYS.length - 1

export function review(box: number, known: boolean, today: string) {
  const next = known ? Math.min(MAX_BOX, box + 1) : 0
  return { box: next, due: format(addDays(parseISO(today), BOX_DAYS[next]), 'yyyy-MM-dd') }
}

export function dueCards<T extends { due: string; box: number; createdAt: number }>(cards: T[], today: string) {
  return cards.filter((c) => c.due <= today).sort((a, b) => a.box - b.box || a.due.localeCompare(b.due) || a.createdAt - b.createdAt)
}
