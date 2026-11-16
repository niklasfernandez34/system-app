import { useLiveQuery } from 'dexie-react-hooks'
import { CARD_ROUND_MIN, CARD_ROUND_XP_MAX_PER_DAY } from '../config/xp'
import { db } from '../db/db'
import { review } from './cardBox'
import { currentDay, logEvent } from './events'

export function useCards(subjectId: number) {
  return useLiveQuery(() => db.cards.where('subjectId').equals(subjectId).toArray(), [subjectId])
}

export async function addCard(subjectId: number, card: { front: string; back: string; topic?: string }) {
  return db.cards.add({ ...card, subjectId, box: 0, due: await currentDay(), createdAt: Date.now() })
}

export function updateCard(id: number, changes: { front?: string; back?: string; topic?: string }) {
  return db.cards.update(id, changes)
}

export function deleteCard(id: number) {
  return db.cards.delete(id)
}

export async function rateCard(id: number, known: boolean) {
  const card = await db.cards.get(id)
  if (!card) return
  await db.cards.update(id, { ...review(card.box, known, await currentDay()), reviewedAt: Date.now() })
}

export async function finishRound(subjectId: number, cards: number) {
  if (cards < CARD_ROUND_MIN) return false
  const day = await currentDay()
  const today = await db.events.where('[type+day]').equals(['cards_round', day]).count()
  if (today >= CARD_ROUND_XP_MAX_PER_DAY) return false
  await logEvent('cards_round', { subjectId, cards })
  return true
}
