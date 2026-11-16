import { useEffect, useState } from 'react'
import { MUSCLE_GROUP } from '../config/sport'
import { db, type ExerciseRecord } from '../db/db'

export type WgerExercise = {
  id: number
  name: string
  group: string
  muscles: string[]
  secondary: string[]
  equipment: string[]
  description: string
  image?: string
  author: string
}

let cache: Promise<WgerExercise[]> | undefined

export function loadWger() {
  cache ??= import('../data/wger.json').then((m) => m.default as WgerExercise[])
  return cache
}

export function useWger() {
  const [list, setList] = useState<WgerExercise[]>()
  useEffect(() => {
    loadWger().then(setList)
  }, [])
  return list
}

export type Filter = { query: string; group?: string; equipment?: string }

export function matchesWger(e: WgerExercise, { group, equipment }: Filter) {
  if (group && e.group !== group && !e.muscles.some((m) => MUSCLE_GROUP[m] === group)) return false
  if (equipment && !e.equipment.includes(equipment)) return false
  return true
}

export function matchesOwn(e: ExerciseRecord, filter: Filter, info?: WgerExercise) {
  const q = filter.query.trim().toLowerCase()
  if (q && !e.name.toLowerCase().includes(q)) return false
  if (info) return matchesWger(info, filter) || (!filter.equipment && e.muscle === filter.group)
  if (filter.group && e.muscle !== filter.group) return false
  if (filter.equipment && e.equipment !== filter.equipment) return false
  return true
}

export function searchWger(list: WgerExercise[], filter: Filter, limit = 200) {
  const q = filter.query.trim().toLowerCase()
  const filtered = !!(filter.group || filter.equipment)
  if (q.length < 2 && !filtered) return []
  const hits = list.filter((e) => (q.length < 2 || e.name.toLowerCase().includes(q)) && matchesWger(e, filter))
  hits.sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
  return hits.slice(0, limit)
}

export async function adoptWger(ex: WgerExercise) {
  const existing = await db.exercises.where('wgerId').equals(ex.id).first()
  if (existing) return existing.id
  return db.exercises.add({ name: ex.name, muscle: ex.group, wgerId: ex.id, createdAt: Date.now() })
}
