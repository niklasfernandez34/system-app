import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Button, DateInput, Dialog, SystemWindow, TextField } from '../components/ui'
import { BossList } from '../components/BossList'
import { StudyTimer } from '../components/StudyTimer'
import { Flashcards } from '../components/Flashcards'
import { StudySheets } from '../components/StudySheets'
import { StudyPlan } from '../components/StudyPlan'
import { XP } from '../config/xp'
import { db, type TodoRecord } from '../db/db'
import { Material } from '../components/Material'
import {
  addTodo,
  deleteTodo,
  toggleTodo,
  updateSubject,
  updateTodo,
} from '../lib/uni'

const SECTIONS = [
  { id: 'uebersicht', label: 'Übersicht', icon: '◈' },
  { id: 'karten', label: 'Karteikarten', icon: '▤' },
  { id: 'zettel', label: 'Lernzettel', icon: '✎' },
  { id: 'plan', label: 'Lernplan', icon: '▦' },
  { id: 'dateien', label: 'Material', icon: '⎙' },
] as const
type Section = (typeof SECTIONS)[number]['id']

export function SubjectPage() {
  const id = Number(useParams().id)
  const subject = useLiveQuery(() => db.subjects.get(id), [id])
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const section = (params.get('bereich') as Section | null) ?? 'uebersicht'
  const [editName, setEditName] = useState<string | null>(null)

  if (subject === undefined) return null
  if (!subject) return <p className="text-center text-sys-muted">Fach nicht gefunden.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="px-3" onClick={() => navigate('/uni')}>
          ‹
        </Button>
        <h1 className="flex-1 truncate text-center text-lg font-semibold tracking-wide text-sys-glow">{subject.name}</h1>
        <Button variant="ghost" className="px-3" onClick={() => setEditName(subject.name)}>
          ✎
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setParams(s.id === 'uebersicht' ? {} : { bereich: s.id }, { replace: true })}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 text-[10px] leading-tight ${
              section === s.id ? 'border-sys-glow bg-sys-glow/15 text-sys-text shadow-glow' : 'border-sys-line text-sys-muted'
            }`}
          >
            <span className="text-lg">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'uebersicht' && <Overview subjectId={id} />}
      {section === 'dateien' && <Material subjectId={id} folders={subject.folders ?? []} />}
      {section === 'karten' && <Flashcards subjectId={id} />}
      {section === 'zettel' && <StudySheets subjectId={id} />}
      {section === 'plan' && <StudyPlan subjectId={id} />}

      <Dialog open={editName !== null} onClose={() => setEditName(null)} title="Fach bearbeiten">
        {editName !== null && (
          <div className="space-y-3">
            <TextField label="Name" value={editName} onChange={setEditName} />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                onClick={async () => {
                  await updateSubject(id, { archived: true })
                  navigate('/uni')
                }}
              >
                Archivieren
              </Button>
              <Button
                disabled={!editName.trim()}
                onClick={async () => {
                  await updateSubject(id, { name: editName.trim() })
                  setEditName(null)
                }}
              >
                Speichern
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

type TodoDraft = { id?: number; text: string; due: string }

const byDue = (a: TodoRecord, b: TodoRecord) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt

function Overview({ subjectId }: { subjectId: number }) {
  const todos = useLiveQuery(() => db.todos.where('subjectId').equals(subjectId).toArray(), [subjectId])
  const [draft, setDraft] = useState<TodoDraft | null>(null)
  const [showDone, setShowDone] = useState(false)
  const open = todos?.filter((t) => !t.done).sort(byDue) ?? []
  const done = todos?.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)) ?? []

  const save = async () => {
    if (!draft?.text.trim()) return
    const due = draft.due || undefined
    if (draft.id) await updateTodo(draft.id, { text: draft.text.trim(), due })
    else await addTodo(subjectId, draft.text.trim(), due)
    setDraft(null)
  }

  return (
    <>
      <SystemWindow title="Lernen">
        <StudyTimer subjectId={subjectId} />
      </SystemWindow>

      <SystemWindow title="To-dos und Fristen">
        {!open.length && <p className="mb-2 text-center text-sm text-sys-muted">Keine offenen To-dos.</p>}
        <ul className="divide-y divide-sys-line">
          {open.map((t) => (
            <TodoRow key={t.id} todo={t} onEdit={() => setDraft({ id: t.id, text: t.text, due: t.due ?? '' })} />
          ))}
        </ul>
        <Button className="mt-3 w-full" onClick={() => setDraft({ text: '', due: '' })}>
          + To-do
        </Button>
        {done.length > 0 && (
          <button type="button" className="mt-3 w-full text-xs text-sys-muted underline" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Erledigte ausblenden' : `Erledigte (${done.length})`}
          </button>
        )}
        {showDone && (
          <ul className="mt-2 divide-y divide-sys-line">
            {done.map((t) => (
              <TodoRow key={t.id} todo={t} />
            ))}
          </ul>
        )}
      </SystemWindow>

      <SystemWindow title="Klausur">
        <BossList only="exam" subjectId={subjectId} />
      </SystemWindow>

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
              <Button disabled={!draft.text.trim()} onClick={save}>
                Speichern
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}

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
