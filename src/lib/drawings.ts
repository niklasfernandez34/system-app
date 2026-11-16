import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DrawingRecord, type Paper, type Stroke } from '../db/db'

export function createDrawing(extra: Partial<Pick<DrawingRecord, 'subjectId' | 'folder' | 'title' | 'category' | 'paper'>> = {}) {
  const now = Date.now()
  return db.drawings.add({ pages: [[]], paper: 'lined', ...extra, createdAt: now, updatedAt: now })
}

export function saveDrawing(id: number, pages: Stroke[][], paper: Paper) {
  return db.drawings.update(id, { pages, paper, updatedAt: Date.now() })
}

export function updateDrawingMeta(id: number, changes: Partial<Pick<DrawingRecord, 'title' | 'category' | 'folder'>>) {
  return db.drawings.update(id, changes)
}

export function deleteDrawings(ids: (number | undefined)[]) {
  return db.drawings.bulkDelete(ids.filter((i): i is number => !!i))
}

export function useDrawing(id: number | undefined) {
  return useLiveQuery(async () => (id ? ((await db.drawings.get(id)) ?? null) : null), [id])
}
