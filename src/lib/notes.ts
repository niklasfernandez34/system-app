import { db } from '../db/db'
import { logEvent } from './events'

export async function addNote(text: string, ref?: string) {
  const now = Date.now()
  const id = await db.notes.add({ text, ref, createdAt: now, updatedAt: now })
  await logEvent('note_added', ref ? { noteId: id, ref } : { noteId: id })
  return id
}

export function updateNote(id: number, text: string) {
  return db.notes.update(id, { text, updatedAt: Date.now() })
}

export function deleteNote(id: number) {
  return db.notes.delete(id)
}
