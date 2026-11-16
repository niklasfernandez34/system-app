import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

export function useSheets(subjectId: number) {
  return useLiveQuery(() => db.sheets.where('subjectId').equals(subjectId).reverse().sortBy('updatedAt'), [subjectId])
}

export async function saveSheet(subjectId: number, data: { id?: number; title: string; text: string; photoIds: number[] }) {
  const now = Date.now()
  if (data.id) return db.sheets.update(data.id, { title: data.title, text: data.text, photoIds: data.photoIds, updatedAt: now })
  return db.sheets.add({ subjectId, title: data.title, text: data.text, photoIds: data.photoIds, createdAt: now, updatedAt: now })
}

export async function deleteSheet(id: number) {
  const sheet = await db.sheets.get(id)
  if (sheet) await db.photos.bulkDelete(sheet.photoIds)
  await db.sheets.delete(id)
}

export function addSheetPhoto(blob: Blob) {
  return db.photos.add({ kind: 'sheet', createdAt: Date.now(), blob })
}

export function usePhotos(ids: number[]) {
  return useLiveQuery(async () => (await db.photos.bulkGet(ids)).filter((p) => !!p), [ids.join(',')])
}
