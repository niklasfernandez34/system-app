import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Dialog, DrawingEditor, DrawingPreview, SystemWindow, TextField } from '../components/ui'
import { db } from '../db/db'
import { addDrawingNote, addNote, attachDrawing, cleanupEmptyNotes, cleanupNote, deleteNote, updateNote } from '../lib/notes'

type Editing = { id: number; text: string; drawingId?: number } | null

export function NotesPage() {
  const notes = useLiveQuery(() => db.notes.orderBy('createdAt').reverse().toArray())
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [drawing, setDrawing] = useState<{ noteId: number; drawingId: number } | null>(null)

  useEffect(() => {
    cleanupEmptyNotes()
  }, [])

  const add = async () => {
    if (!text.trim()) return
    await addNote(text.trim())
    setText('')
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Neue Notiz">
        <div className="space-y-3">
          <TextField multiline rows={3} value={text} onChange={setText} placeholder="Gedanke, Idee, Anmerkung…" />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={async () => {
                const n = await addDrawingNote()
                setDrawing({ noteId: n.id, drawingId: n.drawingId })
              }}
            >
              ✎ Handschrift
            </Button>
            <Button disabled={!text.trim()} onClick={add}>
              Speichern
            </Button>
          </div>
        </div>
      </SystemWindow>

      <SystemWindow title="Notizen">
        {!notes?.length ? (
          <p className="text-center text-sys-muted">Noch keine Notizen.</p>
        ) : (
          <ul className="divide-y divide-sys-line">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="w-full py-3 text-left active:bg-sys-line/20"
                  onClick={() => {
                    setConfirmDelete(false)
                    setEditing({ id: n.id, text: n.text, drawingId: n.drawingId })
                  }}
                >
                  <span className="block text-xs text-sys-muted">
                    {format(n.createdAt, 'd. MMM yyyy, HH:mm', { locale: de })}
                  </span>
                  {n.text && <span className="line-clamp-3 whitespace-pre-wrap">{n.text}</span>}
                  {n.drawingId && (
                    <span className="mt-1 block w-28">
                      <DrawingPreview id={n.drawingId} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Notiz">
        {editing && (
          <div className="space-y-3">
            <TextField multiline rows={6} value={editing.text} onChange={(t) => setEditing({ ...editing, text: t })} />
            {editing.drawingId ? (
              <div className="mx-auto w-40">
                <DrawingPreview id={editing.drawingId} onClick={() => setDrawing({ noteId: editing.id, drawingId: editing.drawingId! })} />
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full"
                onClick={async () => {
                  const drawingId = await attachDrawing(editing.id)
                  setEditing({ ...editing, drawingId })
                  setDrawing({ noteId: editing.id, drawingId })
                }}
              >
                ✎ Handschrift hinzufügen
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                onClick={async () => {
                  if (!confirmDelete) return setConfirmDelete(true)
                  await deleteNote(editing.id)
                  setEditing(null)
                }}
              >
                {confirmDelete ? 'Wirklich?' : 'Löschen'}
              </Button>
              <Button
                disabled={!editing.text.trim() && !editing.drawingId}
                onClick={async () => {
                  await updateNote(editing.id, editing.text.trim())
                  setEditing(null)
                }}
              >
                Speichern
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <DrawingEditor
        id={drawing?.drawingId ?? null}
        onClose={async () => {
          if (!drawing) return
          if (editing?.id === drawing.noteId) await updateNote(editing.id, editing.text.trim())
          await cleanupNote(drawing.noteId)
          const n = await db.notes.get(drawing.noteId)
          if (editing?.id === drawing.noteId) setEditing(n ? { id: n.id, text: n.text, drawingId: n.drawingId } : null)
          setDrawing(null)
        }}
      />
    </div>
  )
}
