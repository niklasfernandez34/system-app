import { getSetting, setSetting } from '../db/settings'
import { daysBetween } from './day'
import { currentDay } from './events'

type DayHandler = (missedDays: string[], today: string) => Promise<void>

const dayHandlers: DayHandler[] = []

export function onNewDay(handler: DayHandler) {
  dayHandlers.push(handler)
}

export async function runStartup() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    /* Speicher nicht dauerhaft möglich */
  }

  const today = await currentDay()
  const last = await getSetting('lastOpenedDay')
  if (last !== today) {
    const missed = daysBetween(last, today)
    for (const handler of dayHandlers) await handler(missed, today)
    await setSetting('lastOpenedDay', today)
  }
}
