import { getSetting, setSetting } from '../db/settings'
import { daysBetween } from './day'
import { currentDay } from './events'
import { repairBlobTypes } from './backup'

type DayHandler = (missedDays: string[], today: string) => Promise<void>

const dayHandlers: DayHandler[] = []

export function onNewDay(handler: DayHandler) {
  dayHandlers.push(handler)
}

let running: Promise<void> | null = null

export function runStartup() {
  running ??= startup().finally(() => (running = null))
  return running
}

async function startup() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    /* Speicher nicht dauerhaft möglich */
  }

  await repairBlobTypes().catch(() => undefined)

  const today = await currentDay()
  const last = await getSetting('lastOpenedDay')
  if (last !== today) {
    const missed = daysBetween(last, today)
    for (const handler of dayHandlers) await handler(missed, today)
    await setSetting('lastOpenedDay', today)
  }
}
