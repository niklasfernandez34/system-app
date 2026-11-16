import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { currentDay } from './events'
import { dailyValues } from './stats'

export function useStatsData(from: (today: string) => string) {
  return useLiveQuery(async () => {
    const today = await currentDay()
    const start = from(today)
    const [events, meals, water, body, journal, subjects] = await Promise.all([
      db.events.where('day').aboveOrEqual(start).toArray(),
      db.meals.where('day').aboveOrEqual(start).toArray(),
      db.water.where(':id').aboveOrEqual(start).toArray(),
      db.body.where(':id').aboveOrEqual(start).toArray(),
      db.journal.where(':id').aboveOrEqual(start).toArray(),
      db.subjects.toArray(),
    ])
    return { today, events, subjects, daily: dailyValues({ events, meals, water, body, journal }) }
  }, [from])
}
