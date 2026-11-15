import { useEffect, useState } from 'react'
import { db } from '../db/db'

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

export function searchWger(list: WgerExercise[], query: string, limit = 30) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const hits = list.filter((e) => e.name.toLowerCase().includes(q))
  hits.sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
  return hits.slice(0, limit)
}

export async function adoptWger(ex: WgerExercise) {
  const existing = await db.exercises.where('wgerId').equals(ex.id).first()
  if (existing) return existing.id
  return db.exercises.add({ name: ex.name, muscle: ex.group, wgerId: ex.id, createdAt: Date.now() })
}
