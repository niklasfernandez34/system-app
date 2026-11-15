import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, Chips, Dialog, NumberInput, SystemWindow, TextField } from '../components/ui'
import { MUSCLES } from '../config/sport'
import type { PlanItem, PlanRecord } from '../db/db'
import { addExercise, archivePlan, fmt, savePlan, useExercises, usePlan } from '../lib/sport'

export function PlanEditPage() {
  const { id } = useParams()
  const planId = id === 'neu' ? undefined : Number(id)
  const plan = usePlan(planId)
  if (planId && !plan) return null
  return <PlanForm key={planId ?? 'neu'} plan={plan} />
}

type Muscle = (typeof MUSCLES)[number]

function PlanForm({ plan }: { plan?: PlanRecord }) {
  const navigate = useNavigate()
  const exercises = useExercises()
  const [name, setName] = useState(plan?.name ?? '')
  const [items, setItems] = useState<PlanItem[]>(plan?.items ?? [])
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [muscle, setMuscle] = useState<Muscle>('Brust')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const byId = new Map(exercises?.map((e) => [e.id, e]))
  const filtered = exercises?.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase())) ?? []

  const addItem = (exerciseId: number) => {
    setItems([...items, { exerciseId, sets: 3, reps: 8, weight: 20 }])
    setPicking(false)
    setSearch('')
    setEditing(items.length)
  }

  const createExercise = async () => {
    const id = await addExercise(newName.trim(), muscle)
    setNewName('')
    addItem(id)
  }

  const move = (i: number, d: number) => {
    const next = [...items]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setItems(next)
  }

  const update = (i: number, changes: Partial<PlanItem>) =>
    setItems(items.map((it, j) => (j === i ? { ...it, ...changes } : it)))

  const save = async () => {
    await savePlan({ id: plan?.id, name: name.trim(), items })
    navigate('/sport')
  }

  const edit = editing !== null ? items[editing] : undefined

  return (
    <div className="space-y-4">
      <SystemWindow title={plan ? 'Plan bearbeiten' : 'Neuer Plan'}>
        <TextField label="Name" value={name} onChange={setName} placeholder="z. B. Push, Oberkörper A" />
      </SystemWindow>

      <SystemWindow title="Übungen">
        {!items.length && <p className="mb-3 text-center text-sys-muted">Noch keine Übungen.</p>}
        <ul className="mb-3 divide-y divide-sys-line">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-1 py-2">
              <button type="button" className="flex-1 text-left" onClick={() => setEditing(i)}>
                <div>{byId.get(it.exerciseId)?.name ?? '?'}</div>
                <div className="text-xs text-sys-muted">
                  {it.sets} × {it.reps} · {fmt(it.weight)} kg
                </div>
              </button>
              <Button variant="ghost" className="px-3" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </Button>
              <Button variant="ghost" className="px-3" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                ↓
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" className="w-full" onClick={() => setPicking(true)}>
          + Übung hinzufügen
        </Button>
      </SystemWindow>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => navigate('/sport')}>
          Abbrechen
        </Button>
        <Button disabled={!name.trim()} onClick={save}>
          Speichern
        </Button>
      </div>
      {plan && (
        <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
          Plan löschen
        </Button>
      )}

      <Dialog open={picking} onClose={() => setPicking(false)} title="Übung wählen">
        <div className="space-y-3">
          <TextField value={search} onChange={setSearch} placeholder="Suchen" />
          <ul className="max-h-48 divide-y divide-sys-line overflow-y-auto">
            {filtered.map((e) => (
              <li key={e.id}>
                <button type="button" className="flex w-full justify-between py-2 text-left" onClick={() => addItem(e.id)}>
                  <span>{e.name}</span>
                  <span className="text-xs text-sys-muted">{e.muscle}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-3 border-t border-sys-line pt-3">
            <TextField label="Neue Übung" value={newName} onChange={setNewName} placeholder="z. B. Bankdrücken" />
            <Chips label="Muskelgruppe" options={MUSCLES} value={muscle} onChange={setMuscle} />
            <Button className="w-full" disabled={!newName.trim()} onClick={createExercise}>
              Anlegen und hinzufügen
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!edit} onClose={() => setEditing(null)} title={edit ? byId.get(edit.exerciseId)?.name : ''}>
        {edit && editing !== null && (
          <div className="space-y-3">
            <NumberInput label="Sätze" min={1} max={20} value={edit.sets} onChange={(v) => update(editing, { sets: v })} />
            <NumberInput
              label="Wiederholungen"
              min={1}
              max={100}
              value={edit.reps}
              onChange={(v) => update(editing, { reps: v })}
            />
            <NumberInput
              label="Startgewicht"
              unit="kg"
              step={2.5}
              min={0}
              value={edit.weight}
              onChange={(v) => update(editing, { weight: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  setItems(items.filter((_, j) => j !== editing))
                  setEditing(null)
                }}
              >
                Entfernen
              </Button>
              <Button onClick={() => setEditing(null)}>Fertig</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Plan löschen?">
        <p className="mb-3 text-sys-muted">Abgeschlossene Trainings bleiben erhalten.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Nein
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (plan) await archivePlan(plan.id)
              navigate('/sport')
            }}
          >
            Löschen
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
