import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { deleteDrawings } from './drawings'

export function useSheets(subjectId: number) {
  return useLiveQuery(() => db.sheets.where('subjectId').equals(subjectId).reverse().sortBy('updatedAt'), [subjectId])
}

export async function saveSheet(subjectId: number, data: { id?: number; title: string; text: string; photoIds: number[]; drawingIds: number[] }) {
  const now = Date.now()
  const fields = { title: data.title, text: data.text, photoIds: data.photoIds, drawingIds: data.drawingIds, updatedAt: now }
  if (data.id) return db.sheets.update(data.id, fields)
  return db.sheets.add({ subjectId, ...fields, createdAt: now })
}

export async function deleteSheet(id: number) {
  const sheet = await db.sheets.get(id)
  if (sheet) await db.photos.bulkDelete(sheet.photoIds)
  if (sheet) await deleteDrawings(sheet.drawingIds ?? [])
  await db.sheets.delete(id)
}

export function addSheetPhoto(blob: Blob) {
  return db.photos.add({ kind: 'sheet', createdAt: Date.now(), blob })
}

export function usePhotos(ids: number[]) {
  return useLiveQuery(async () => (await db.photos.bulkGet(ids)).filter((p) => !!p), [ids.join(',')])
}
