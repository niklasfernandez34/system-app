import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DrawingRecord, type FileCategory, type FileRecord, type LinkRecord } from '../db/db'

export type MaterialItem =
  | ({ kind: 'file' } & FileRecord)
  | ({ kind: 'link' } & LinkRecord)
  | ({ kind: 'drawing'; category: FileCategory; title: string } & Omit<DrawingRecord, 'category' | 'title'>)

export function useMaterial(subjectId: number) {
  return useLiveQuery(async () => {
    const files = await db.files.where('subjectId').equals(subjectId).toArray()
    const links = await db.links.where('subjectId').equals(subjectId).toArray()
    const drawings = await db.drawings.where('subjectId').equals(subjectId).toArray()
    return [
      ...files.map((f) => ({ ...f, kind: 'file' as const })),
      ...links.map((l) => ({ ...l, kind: 'link' as const })),
      ...drawings.map((d) => ({ ...d, kind: 'drawing' as const, category: d.category ?? 'note', title: d.title ?? 'Handschrift' })),
    ].sort(
      (a, b) => b.createdAt - a.createdAt,
    ) as MaterialItem[]
  }, [subjectId])
}

export function addLink(subjectId: number, data: { title: string; url: string; category: FileCategory; folder?: string }) {
  return db.links.add({ ...data, subjectId, createdAt: Date.now() })
}

export function updateLink(id: number, changes: Partial<Pick<LinkRecord, 'title' | 'url' | 'category' | 'folder'>>) {
  return db.links.update(id, changes)
}

export function updateFile(id: number, changes: Partial<Pick<FileRecord, 'name' | 'category' | 'folder' | 'noSync'>>) {
  return db.files.update(id, changes)
}

export function deleteLink(id: number) {
  return db.links.delete(id)
}

export async function addFolder(subjectId: number, name: string) {
  const s = await db.subjects.get(subjectId)
  if (!s || s.folders?.includes(name)) return
  await db.subjects.update(subjectId, { folders: [...(s.folders ?? []), name] })
}

export async function renameFolder(subjectId: number, from: string, to: string) {
  const s = await db.subjects.get(subjectId)
  if (!s || from === to || s.folders?.includes(to)) return
  await db.transaction('rw', [db.subjects, db.files, db.links, db.drawings], async () => {
    await db.subjects.update(subjectId, { folders: (s.folders ?? []).map((f) => (f === from ? to : f)) })
    await db.drawings.where('subjectId').equals(subjectId).filter((d) => d.folder === from).modify({ folder: to })
    await db.files.where('subjectId').equals(subjectId).filter((f) => f.folder === from).modify({ folder: to })
    await db.links.where('subjectId').equals(subjectId).filter((l) => l.folder === from).modify({ folder: to })
  })
}

export async function deleteFolder(subjectId: number, name: string) {
  const s = await db.subjects.get(subjectId)
  if (!s) return
  await db.transaction('rw', [db.subjects, db.files, db.links, db.drawings], async () => {
    await db.subjects.update(subjectId, { folders: (s.folders ?? []).filter((f) => f !== name) })
    await db.drawings.where('subjectId').equals(subjectId).filter((d) => d.folder === name).modify({ folder: undefined })
    await db.files.where('subjectId').equals(subjectId).filter((f) => f.folder === name).modify({ folder: undefined })
    await db.links.where('subjectId').equals(subjectId).filter((l) => l.folder === name).modify({ folder: undefined })
  })
}
