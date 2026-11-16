import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { attributes, levelFromXp, totalXp } from './level'

export function useLevel() {
  return useLiveQuery(async () => {
    const events = await db.events.toArray()
    const xp = totalXp(events)
    return { xp, ...levelFromXp(xp), attributes: attributes(events) }
  })
}
