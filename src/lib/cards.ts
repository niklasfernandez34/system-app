import { useLiveQuery } from 'dexie-react-hooks'
import { CARD_ROUND_MIN, CARD_ROUND_XP_MAX_PER_DAY } from '../config/xp'
import { db } from '../db/db'
import { review } from './cardBox'
import { deleteDrawings } from './drawings'
import { currentDay, logEvent } from './events'

export function useCards(subjectId: number) {
  return useLiveQuery(() => db.cards.where('subjectId').equals(subjectId).toArray(), [subjectId])
}

type CardData = { front: string; back: string; topic?: string; frontDrawing?: number; backDrawing?: number }

export async function addCard(subjectId: number, card: CardData) {
  return db.cards.add({ ...card, subjectId, box: 0, due: await currentDay(), createdAt: Date.now() })
}

export function updateCard(id: number, changes: Partial<CardData>) {
  return db.cards.update(id, changes)
}

export async function deleteCard(id: number) {
  const c = await db.cards.get(id)
  await deleteDrawings([c?.frontDrawing, c?.backDrawing])
  await db.cards.delete(id)
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
