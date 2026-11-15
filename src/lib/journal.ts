import { useLiveQuery } from 'dexie-react-hooks'
import { db, type JournalRecord } from '../db/db'
import { currentDay, logEvent } from './events'

export type Checkin = Omit<JournalRecord, 'day' | 'updatedAt'>

export const EMPTY_CHECKIN: Checkin = { sleepHours: 7, sleep: 3, energy: 3, mood: 3, text: '' }

export async function saveCheckin(entry: Checkin) {
  const day = await currentDay()
  const prev = await db.journal.get(day)
  await db.journal.put({ ...entry, day, updatedAt: Date.now() })
  const { sleepHours, sleep, energy, mood } = entry
  if (!prev) await logEvent('checkin_done', { sleepHours, sleep, energy, mood })
  if (entry.text.trim() && !prev?.text.trim()) await logEvent('journal_written')
}

export function useTodayCheckin() {
  return useLiveQuery(async () => (await db.journal.get(await currentDay())) ?? null)
}
