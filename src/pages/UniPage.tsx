import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button, DateInput, Dialog, SystemWindow, TextField } from '../components/ui'
import { BossList } from '../components/BossList'
import { Deadlines } from '../components/Deadlines'
import { StudyTimer } from '../components/StudyTimer'
import { XP } from '../config/xp'
import type { SubjectRecord, TodoRecord } from '../db/db'
import {
  addSubject,
  addTodo,
  deleteTodo,
  toggleTodo,
  updateSubject,
  updateTodo,
  useSubjects,
  useTodos,
} from '../lib/uni'

type TodoDraft = { id?: number; subjectId: number; text: string; due: string }

export function UniPage() {
  const subjects = useSubjects()
  const todos = useTodos()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<SubjectRecord | null>(null)
  const [draft, setDraft] = useState<TodoDraft | null>(null)
  const [showDone, setShowDone] = useState<number | null>(null)
  const active = subjects?.filter((s) => !s.archived) ?? []
  const archived = subjects?.filter((s) => s.archived) ?? []

  const add = async () => {
    if (!name.trim()) return
    await addSubject(name.trim())
    setName('')
  }

  const saveTodo = async () => {
    if (!draft?.text.trim()) return
    const due = draft.due || undefined
    if (draft.id) await updateTodo(draft.id, { text: draft.text.trim(), due })
    else await addTodo(draft.subjectId, draft.text.trim(), due)
    setDraft(null)
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Lern-Timer">
        <StudyTimer />
      </SystemWindow>

      <Deadlines />

      <SystemWindow title="Klausuren">
        <BossList only="exam" />
      </SystemWindow>

      {active.map((s) => {
        const list = todos?.filter((t) => t.subjectId === s.id) ?? []
        const open = list.filter((t) => !t.done).sort(byDue)
        const done = list.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
        return (
          <SystemWindow key={s.id} title={s.name}>
            {!open.length && <p className="mb-2 text-center text-sm text-sys-muted">Keine offenen To-dos.</p>}
            <ul className="divide-y divide-sys-line">
              {open.map((t) => (
                <TodoRow key={t.id} todo={t} onEdit={() => setDraft({ id: t.id, subjectId: s.id, text: t.text, due: t.due ?? '' })} />
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={() => setDraft({ subjectId: s.id, text: '', due: '' })}>+ To-do</Button>
              <Button variant="ghost" onClick={() => setEditing(s)}>
                Fach bearbeiten
              </Button>
            </div>
            {done.length > 0 && (
              <button
                type="button"
                className="mt-3 w-full text-xs text-sys-muted underline"
                onClick={() => setShowDone(showDone === s.id ? null : s.id)}
              >
                {showDone === s.id ? 'Erledigte ausblenden' : `Erledigte (${done.length})`}
              </button>
            )}
            {showDone === s.id && (
              <ul className="mt-2 divide-y divide-sys-line">
                {done.map((t) => (
                  <TodoRow key={t.id} todo={t} />
                ))}
              </ul>
            )}
          </SystemWindow>
        )
      })}

      <SystemWindow title="Fächer">
        <div className="flex gap-2">
          <div className="flex-1">
            <TextField value={name} onChange={setName} placeholder="Neues Fach, z. B. Mathe 1" />
          </div>
          <Button onClick={add} disabled={!name.trim()}>
            +
          </Button>
        </div>
        {archived.length > 0 && (
          <ul className="mt-3 divide-y divide-sys-line">
            {archived.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <span className="flex-1 text-sys-muted">{s.name}</span>
                <Button variant="ghost" onClick={() => updateSubject(s.id, { archived: false })}>
                  Zurückholen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Fach bearbeiten">
        {editing && (
          <div className="space-y-3">
            <TextField label="Name" value={editing.name} onChange={(n) => setEditing({ ...editing, name: n })} />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                onClick={async () => {
                  await updateSubject(editing.id, { archived: true })
                  setEditing(null)
                }}
              >
                Archivieren
              </Button>
              <Button
                disabled={!editing.name.trim()}
                onClick={async () => {
                  await updateSubject(editing.id, { name: editing.name.trim() })
                  setEditing(null)
                }}
              >
                Speichern
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'To-do bearbeiten' : 'Neues To-do'}>
        {draft && (
          <div className="space-y-3">
            <TextField label="Aufgabe" value={draft.text} onChange={(text) => setDraft({ ...draft, text })} placeholder="z. B. Übungsblatt 3" />
            <DateInput label="Frist (optional)" value={draft.due} onChange={(due) => setDraft({ ...draft, due })} />
            {draft.due && (
              <button type="button" className="text-xs text-sys-muted underline" onClick={() => setDraft({ ...draft, due: '' })}>
                Frist entfernen
              </button>
            )}
            <p className="text-center text-xs text-sys-muted">Erledigt: +{XP.todo_done} XP (Intelligenz)</p>
            <div className={`grid gap-2 ${draft.id ? 'grid-cols-2' : ''}`}>
              {draft.id && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    await deleteTodo(draft.id!)
                    setDraft(null)
                  }}
                >
                  Löschen
                </Button>
              )}
              <Button disabled={!draft.text.trim()} onClick={saveTodo}>
                Speichern
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

const byDue = (a: TodoRecord, b: TodoRecord) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt

function TodoRow({ todo, onEdit }: { todo: TodoRecord; onEdit?: () => void }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <button
        type="button"
        aria-label={todo.done ? 'Als offen markieren' : 'Erledigt'}
        onClick={() => toggleTodo(todo.id)}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
          todo.done ? 'border-sys-glow bg-sys-glow/20 text-sys-glow' : 'border-sys-line'
        }`}
      >
        {todo.done && '✓'}
      </button>
      <button type="button" className="flex-1 text-left" onClick={onEdit} disabled={!onEdit}>
        <span className={todo.done ? 'text-sys-muted line-through' : ''}>{todo.text}</span>
        {todo.due && !todo.done && (
          <span className="block text-xs text-sys-muted">bis {format(parseISO(todo.due), 'EEE, d. MMM', { locale: de })}</span>
        )}
      </button>
    </li>
  )
}
