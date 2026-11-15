import { db, type EventRecord } from '../db/db'
import { getSetting } from '../db/settings'
import type { EventType } from '../config/xp'
import { logicalDay } from './day'

export async function logEvent(type: EventType, data?: Record<string, unknown>, at = new Date()) {
  const day = logicalDay(at, await getSetting('dayStartHour'))
  const event: Omit<EventRecord, 'id'> = { type, at: at.getTime(), day, data }
  return db.events.add(event as EventRecord)
}

export async function currentDay(now = new Date()) {
  return logicalDay(now, await getSetting('dayStartHour'))
}
