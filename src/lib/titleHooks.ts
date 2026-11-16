import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { currentDay } from './events'
import { titleStatus } from './titles'

export async function loadTitles() {
  return titleStatus(await db.events.toArray(), await currentDay())
}

export function useTitles() {
  return useLiveQuery(loadTitles)
}
