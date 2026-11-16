import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { GoalMode, NutritionPlan } from '../lib/calorieCalc'

export const DEFAULT_SETTINGS = {
  dayStartHour: 4,
  lastOpenedDay: '' as string,
  lastBackupAt: 0,
  pinHash: '' as string,
  restSeconds: 90,
  weightIncrement: 2.5,
  seenStage: 0,
  seenTitles: null as string[] | null,
  activeTitle: '' as string,
  kcalGoal: 2500,
  proteinGoal: 150,
  carbsGoal: 300,
  fatGoal: 80,
  waterGoal: 3000,
  nutritionSince: '' as string,
  goalMode: 'gain' as GoalMode,
  nutritionPlan: null as NutritionPlan | null,
  focusMinutes: 25,
  breakMinutes: 5,
  studyTimer: null as StudyTimer | null,
}

export type StudyTimer = { subjectId: number; phase: 'focus' | 'break'; endsAt: number; total: number }

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
