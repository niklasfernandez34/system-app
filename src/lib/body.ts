import { subDays, parseISO, format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BodyRecord } from '../db/db'
import { currentDay, logEvent } from './events'

export const BODY_FIELDS = [
  { key: 'weight', label: 'Gewicht', unit: 'kg', step: 0.1, start: 75 },
  { key: 'waist', label: 'Taille', unit: 'cm', step: 0.5, start: 80 },
  { key: 'chest', label: 'Brust', unit: 'cm', step: 0.5, start: 100 },
  { key: 'arm', label: 'Arm', unit: 'cm', step: 0.5, start: 35 },
  { key: 'thigh', label: 'Oberschenkel', unit: 'cm', step: 0.5, start: 55 },
  { key: 'hip', label: 'Hüfte', unit: 'cm', step: 0.5, start: 95 },
] as const

export type BodyKey = (typeof BODY_FIELDS)[number]['key']
export type BodyValues = Partial<Record<BodyKey, number>>

export async function saveBody(values: BodyValues) {
  const day = await currentDay()
  await db.body.put({ day, ...values, updatedAt: Date.now() })
  const logged = await db.events.where('[type+day]').equals(['body_logged', day]).count()
  if (!logged) await logEvent('body_logged', { ...values })
}

export function useBody() {
  return useLiveQuery(async () => ({ today: await currentDay(), entries: await db.body.orderBy('day').toArray() }))
}

export function lastKnown(entries: BodyRecord[]) {
  const out: BodyValues = {}
  for (const e of entries) for (const f of BODY_FIELDS) if (e[f.key] !== undefined) out[f.key] = e[f.key]
  return out
}

export function bodyChange(entries: BodyRecord[], key: BodyKey, today: string) {
  const points = entries.filter((e) => e[key] !== undefined).map((e) => ({ day: e.day, value: e[key]! }))
  if (!points.length) return null
  const last = points[points.length - 1].value
  const since = format(subDays(parseISO(today), 30), 'yyyy-MM-dd')
  const base30 = [...points].reverse().find((p) => p.day <= since) ?? points[0]
  const r = (n: number) => Math.round(n * 10) / 10
  return { points, last, total: r(last - points[0].value), last30: r(last - base30.value) }
}
