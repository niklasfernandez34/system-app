import { db } from '../db/db'
import { isEmpty } from './drawing'
import { createDrawing, deleteDrawings } from './drawings'
import { logEvent } from './events'

export async function addNote(text: string, ref?: string, drawingId?: number) {
  const now = Date.now()
  const id = await db.notes.add({ text, ref, drawingId, createdAt: now, updatedAt: now })
  await logEvent('note_added', ref ? { noteId: id, ref } : { noteId: id })
  return id
}

export async function addDrawingNote() {
  const drawingId = await createDrawing()
  const id = await addNote('', undefined, drawingId)
  return { id, drawingId }
}

export async function attachDrawing(id: number) {
  const drawingId = await createDrawing()
  await db.notes.update(id, { drawingId, updatedAt: Date.now() })
  return drawingId
}

export function updateNote(id: number, text: string) {
  return db.notes.update(id, { text, updatedAt: Date.now() })
}

export async function deleteNote(id: number) {
  const note = await db.notes.get(id)
  await deleteDrawings([note?.drawingId])
  await db.notes.delete(id)
}

export async function cleanupNote(id: number) {
  const note = await db.notes.get(id)
  if (!note?.drawingId) return
  const d = await db.drawings.get(note.drawingId)
  if (d && !isEmpty(d.pages)) return db.notes.update(id, { updatedAt: Date.now() })
  if (note.text.trim()) {
    await deleteDrawings([note.drawingId])
    await db.notes.update(id, { drawingId: undefined })
  } else await deleteNote(id)
}

export async function cleanupEmptyNotes() {
  for (const n of await db.notes.filter((n) => !!n.drawingId && !n.text.trim()).toArray()) await cleanupNote(n.id)
}
