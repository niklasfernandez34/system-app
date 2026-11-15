import { useState } from 'react'
import { Button, Dialog, SystemWindow, TextField } from '../components/ui'
import { HabitChecklist } from '../components/HabitChecklist'
import { addHabit, updateHabit, useHabits } from '../lib/habits'

type Editing = { id: number; name: string } | null

export function HabitsPage() {
  const habits = useHabits()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const active = habits?.filter((h) => !h.archived) ?? []
  const archived = habits?.filter((h) => h.archived) ?? []

  const add = async () => {
    if (!name.trim()) return
    await addHabit(name.trim())
    setName('')
  }

  const saveEdit = async (changes: { name?: string; archived?: boolean }) => {
    if (editing) await updateHabit(editing.id, changes)
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Habits heute">
        <HabitChecklist />
      </SystemWindow>

      <SystemWindow title="Verwalten">
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <TextField value={name} onChange={setName} placeholder="Neues Habit, z. B. 10 Min. lesen" />
          </div>
          <Button onClick={add} disabled={!name.trim()}>
            +
          </Button>
        </div>
        <ul className="divide-y divide-sys-line">
          {active.map((h) => (
            <li key={h.id} className="flex items-center gap-2 py-2">
              <span className="flex-1">{h.name}</span>
              <span className="text-xs text-sys-muted">
                Serie {h.current} · Rekord {h.longest}
              </span>
              <Button variant="ghost" className="px-3" onClick={() => setEditing({ id: h.id, name: h.name })}>
                ✎
              </Button>
            </li>
          ))}
        </ul>
      </SystemWindow>

      {archived.length > 0 && (
        <SystemWindow title="Archiv">
          <ul className="divide-y divide-sys-line">
            {archived.map((h) => (
              <li key={h.id} className="flex items-center gap-2 py-2">
                <span className="flex-1 text-sys-muted">{h.name}</span>
                <Button variant="ghost" onClick={() => updateHabit(h.id, { archived: false })}>
                  Zurückholen
                </Button>
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Habit bearbeiten">
        {editing && (
          <div className="space-y-3">
            <TextField label="Name" value={editing.name} onChange={(n) => setEditing({ ...editing, name: n })} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="danger" onClick={() => saveEdit({ archived: true })}>
                Archivieren
              </Button>
              <Button disabled={!editing.name.trim()} onClick={() => saveEdit({ name: editing.name.trim() })}>
                Speichern
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
