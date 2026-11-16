import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, Dialog, NumberInput, SystemWindow, TextField } from '../components/ui'
import type { PlanItem, PlanRecord } from '../db/db'
import { archivePlan, fmt, savePlan, useExercises, usePlan } from '../lib/sport'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseInfo } from '../components/ExerciseInfo'

export function PlanEditPage() {
  const { id } = useParams()
  const planId = id === 'neu' ? undefined : Number(id)
  const plan = usePlan(planId)
  if (planId && !plan) return null
  return <PlanForm key={planId ?? 'neu'} plan={plan} />
}

function PlanForm({ plan }: { plan?: PlanRecord }) {
  const navigate = useNavigate()
  const exercises = useExercises()
  const [name, setName] = useState(plan?.name ?? '')
  const [items, setItems] = useState<PlanItem[]>(plan?.items ?? [])
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [infoId, setInfoId] = useState<number | null>(null)

  const byId = new Map(exercises?.map((e) => [e.id, e]))

  const addItem = (exerciseId: number) => {
    setItems([...items, { exerciseId, sets: 3, reps: 8, weight: 20 }])
    setPicking(false)
    setEditing(items.length)
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
              <Button variant="ghost" className="px-3" onClick={() => setInfoId(it.exerciseId)}>
                ⓘ
              </Button>
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

<ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={addItem} />

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

      <ExerciseInfo exerciseId={infoId} onClose={() => setInfoId(null)} />

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
