import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export const DEFAULT_SETTINGS = {
  dayStartHour: 4,
  lastOpenedDay: '' as string,
  lastBackupAt: 0,
  pinHash: '' as string,
}

export type Settings = typeof DEFAULT_SETTINGS
export type SettingKey = keyof Settings

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  const row = await db.settings.get(key)
  return (row?.value as Settings[K]) ?? DEFAULT_SETTINGS[key]
}

export function setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  return db.settings.put({ key, value })
}

export function useSetting<K extends SettingKey>(key: K): Settings[K] {
  return useLiveQuery(() => getSetting(key), [key]) ?? DEFAULT_SETTINGS[key]
}
