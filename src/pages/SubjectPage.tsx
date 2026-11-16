import { useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Button, Chips, DateInput, Dialog, SystemWindow, TextField } from '../components/ui'
import { BossList } from '../components/BossList'
import { StudyTimer } from '../components/StudyTimer'
import { XP } from '../config/xp'
import { db, type FileCategory, type FileRecord, type TodoRecord } from '../db/db'
import {
  addFiles,
  addTodo,
  deleteFile,
  deleteTodo,
  moveFile,
  openFile,
  renameFile,
  shareFile,
  toggleTodo,
  updateSubject,
  updateTodo,
  useSubjectFiles,
} from '../lib/uni'

const SECTIONS = [
  { id: 'uebersicht', label: 'Übersicht', icon: '◈' },
  { id: 'karten', label: 'Karteikarten', icon: '▤' },
  { id: 'zettel', label: 'Lernzettel', icon: '✎' },
  { id: 'plan', label: 'Lernplan', icon: '▦' },
  { id: 'dateien', label: 'Dateien', icon: '⎙' },
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
            className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] leading-tight ${
              section === s.id ? 'border-sys-glow bg-sys-glow/15 text-sys-text shadow-glow' : 'border-sys-line text-sys-muted'
            }`}
          >
            <span className="text-lg">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'uebersicht' && <Overview subjectId={id} />}
      {section === 'dateien' && <Files subjectId={id} />}
      {(section === 'karten' || section === 'zettel' || section === 'plan') && (
        <SystemWindow title={SECTIONS.find((s) => s.id === section)!.label}>
          <p className="text-center text-sys-muted">Kommt im nächsten Schritt.</p>
        </SystemWindow>
      )}

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

const CATEGORIES: { id: FileCategory; label: string; one: string }[] = [
  { id: 'script', label: 'Skripte', one: 'Skript' },
  { id: 'exercise', label: 'Übungen', one: 'Übung' },
  { id: 'note', label: 'Notizen', one: 'Notiz' },
]
const FILTERS = ['Alle', ...CATEGORIES.map((c) => c.label)] as const

const sizeLabel = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)
const fileIcon = (t: string) => (t === 'application/pdf' ? 'PDF' : t.startsWith('image/') ? 'BILD' : 'DATEI')

function Files({ subjectId }: { subjectId: number }) {
  const files = useSubjectFiles(subjectId)
  const input = useRef<HTMLInputElement>(null)
  const category = useRef<FileCategory>('script')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Alle')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<FileRecord | null>(null)
  const shown = files?.filter((f) => filter === 'Alle' || CATEGORIES.find((c) => c.id === f.category)?.label === filter) ?? []
  const total = files?.reduce((a, f) => a + f.size, 0) ?? 0

  const pick = (c: FileCategory) => {
    category.current = c
    input.current?.click()
  }

  return (
    <SystemWindow title="Dateien">
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        onChange={async (e) => {
          const list = e.target.files
          if (!list?.length) return
          setBusy(true)
          try {
            await addFiles(subjectId, category.current, list)
          } finally {
            setBusy(false)
            e.target.value = ''
          }
        }}
      />
      <div className="mb-4 grid grid-cols-3 gap-2">
        {CATEGORIES.map((c) => (
          <Button key={c.id} disabled={busy} className="px-2 text-sm" onClick={() => pick(c.id)}>
            + {c.one}
          </Button>
        ))}
      </div>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      {!shown.length && <p className="mt-4 text-center text-sm text-sys-muted">Noch keine Dateien.</p>}
      <ul className="mt-3 divide-y divide-sys-line">
        {shown.map((f) => (
          <li key={f.id} className="flex items-center gap-3 py-2">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => openFile(f)}>
              <span className="w-11 shrink-0 rounded border border-sys-glow/60 py-1 text-center text-[10px] font-semibold text-sys-glow">
                {fileIcon(f.type)}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{f.name}</span>
                <span className="block text-xs text-sys-muted">
                  {CATEGORIES.find((c) => c.id === f.category)?.one} · {sizeLabel(f.size)} · {format(f.createdAt, 'd.M.yy')}
                </span>
              </span>
            </button>
            <Button variant="ghost" className="px-3" onClick={() => setEditing(f)}>
              ⋯
            </Button>
          </li>
        ))}
      </ul>
      {total > 0 && <p className="mt-3 text-center text-xs text-sys-muted">Belegt: {sizeLabel(total)} · Im Backup unter „Fotos + Dateien“</p>}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Datei">
        {editing && (
          <div className="space-y-3">
            <TextField label="Name" value={editing.name} onChange={(name) => setEditing({ ...editing, name })} />
            <Chips
              label="Art"
              options={CATEGORIES.map((c) => c.one)}
              value={CATEGORIES.find((c) => c.id === editing.category)!.one}
              onChange={(one) => setEditing({ ...editing, category: CATEGORIES.find((c) => c.one === one)!.id })}
            />
            <Button variant="ghost" className="w-full" onClick={() => shareFile(editing)}>
              Teilen / In anderer App öffnen
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteFile(editing.id)
                  setEditing(null)
                }}
              >
                Löschen
              </Button>
              <Button
                disabled={!editing.name.trim()}
                onClick={async () => {
                  await renameFile(editing.id, editing.name.trim())
                  await moveFile(editing.id, editing.category)
                  setEditing(null)
                }}
              >
                Speichern
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </SystemWindow>
  )
}
