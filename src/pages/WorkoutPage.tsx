import { useState } from 'react'
import { useNavigate } from 'react-router'
import { RestTimer } from '../components/RestTimer'
import { Button, Dialog, NumberInput, SystemWindow } from '../components/ui'
import type { WorkoutRecord, WorkoutSet } from '../db/db'
import { useSetting } from '../db/settings'
import { unlockAudio } from '../lib/beep'
import type { PR } from '../lib/pr'
import {
  cancelWorkout,
  finishWorkout,
  fmt,
  modifyEntries,
  useExerciseNames,
  usePlanNames,
  useRunningWorkout,
} from '../lib/sport'

type Editing = { e: number; s: number; weight: number; reps: number } | null

export function WorkoutPage() {
  const navigate = useNavigate()
  const workout = useRunningWorkout()
  const names = useExerciseNames()
  const planNames = usePlanNames()
  const [prs, setPrs] = useState<PR[] | null>(null)

  if (prs) {
    return (
      <SystemWindow title="Training abgeschlossen">
        {prs.length ? (
          <ul className="mb-4 space-y-2">
            {prs.map((p, i) => (
              <li key={i} className="rounded-md border border-sys-glow bg-sys-glow/10 p-2 text-center">
                <div className="text-xs uppercase tracking-widest text-sys-glow">Neue Bestleistung</div>
                <div>
                  {names?.get(p.exerciseId)}: {fmt(p.value)} kg {p.kind === 'e1rm' && '(1RM geschätzt)'}
                </div>
                <div className="text-xs text-sys-muted">vorher {fmt(p.previous)} kg</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-center text-sys-muted">Gut gemacht. Training gespeichert.</p>
        )}
        <Button className="w-full" onClick={() => navigate('/sport')}>
          Fertig
        </Button>
      </SystemWindow>
    )
  }

  if (workout === undefined) return null
  if (workout === null) {
    return (
      <SystemWindow title="Training">
        <p className="mb-3 text-center text-sys-muted">Kein Training aktiv.</p>
        <Button className="w-full" onClick={() => navigate('/sport')}>
          Zu den Plänen
        </Button>
      </SystemWindow>
    )
  }

  return (
    <RunningWorkout
      workout={workout}
      title={planNames?.get(workout.planId) ?? 'Training'}
      names={names}
      onFinish={async () => setPrs(await finishWorkout(workout.id))}
      onCancel={async () => {
        await cancelWorkout(workout.id)
        navigate('/sport')
      }}
    />
  )
}

type Props = {
  workout: WorkoutRecord
  title: string
  names?: Map<number, string>
  onFinish: () => void
  onCancel: () => void
}

function RunningWorkout({ workout, title, names, onFinish, onCancel }: Props) {
  const restSeconds = useSetting('restSeconds')
  const increment = useSetting('weightIncrement')
  const [editing, setEditing] = useState<Editing>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const { entries } = workout
  const doneCount = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const total = entries.reduce((n, e) => n + e.sets.length, 0)

  const mapSets = (e: number, fn: (sets: WorkoutSet[]) => WorkoutSet[], startRest = false) =>
    modifyEntries(
      workout.id,
      (all) => all.map((x, i) => (i === e ? { ...x, sets: fn(x.sets) } : x)),
      startRest ? Date.now() + restSeconds * 1000 : undefined,
    )

  const toggle = (e: number, s: number) => {
    const done = !entries[e].sets[s].done
    if (done) unlockAudio()
    mapSets(e, (sets) => sets.map((x, j) => (j === s ? { ...x, done } : x)), done)
  }

  const addSet = (e: number) =>
    mapSets(e, (sets) => {
      const last = sets[sets.length - 1] ?? { weight: 0, reps: entries[e].targetReps }
      return [...sets, { weight: last.weight, reps: last.reps, done: false }]
    })

  const removeSet = (e: number) => mapSets(e, (sets) => sets.slice(0, -1))

  const saveEdit = (allOpen: boolean) => {
    if (!editing) return
    const { e, s, weight, reps } = editing
    mapSets(e, (sets) => sets.map((x, j) => (j === s || (allOpen && j > s && !x.done) ? { ...x, weight, reps } : x)))
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <SystemWindow title={title}>
        <p className="text-center text-sm text-sys-muted">
          {doneCount} / {total} Sätze erledigt
        </p>
      </SystemWindow>

      {entries.map((entry, e) => (
        <SystemWindow key={e} title={names?.get(entry.exerciseId) ?? '?'}>
          {entry.lastWeight !== undefined && (
            <p className="mb-2 text-center text-xs text-sys-muted">
              Letztes Mal {fmt(entry.lastWeight)} kg
              {entry.sets[0] && entry.sets[0].weight > entry.lastWeight && (
                <span className="text-sys-glow"> · heute mehr ↑</span>
              )}
            </p>
          )}
          <ul className="space-y-2">
            {entry.sets.map((set, s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="w-14 text-xs text-sys-muted">Satz {s + 1}</span>
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-md border border-sys-line text-center active:bg-sys-line/30"
                  onClick={() => setEditing({ e, s, weight: set.weight, reps: set.reps })}
                >
                  {fmt(set.weight)} kg × {set.reps}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(e, s)}
                  className={`flex h-11 w-11 items-center justify-center rounded-md border text-lg ${
                    set.done ? 'border-sys-glow bg-sys-glow text-sys-bg shadow-glow' : 'border-sys-muted'
                  }`}
                >
                  {set.done ? '✓' : ''}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" disabled={!entry.sets.length} onClick={() => removeSet(e)}>
              − Satz
            </Button>
            <Button variant="ghost" onClick={() => addSet(e)}>
              + Satz
            </Button>
          </div>
        </SystemWindow>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" onClick={() => setConfirmCancel(true)}>
          Verwerfen
        </Button>
        <Button disabled={!doneCount} onClick={onFinish}>
          Beenden
        </Button>
      </div>

      {workout.restEndsAt && (
        <div className="sticky bottom-2">
          <RestTimer workoutId={workout.id} endsAt={workout.restEndsAt} total={restSeconds} />
        </div>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={`Satz ${(editing?.s ?? 0) + 1}`}>
        {editing && (
          <div className="space-y-3">
            <NumberInput
              label="Gewicht"
              unit="kg"
              step={increment || 2.5}
              min={0}
              value={editing.weight}
              onChange={(v) => setEditing({ ...editing, weight: v })}
            />
            <NumberInput
              label="Wiederholungen"
              min={0}
              max={100}
              value={editing.reps}
              onChange={(v) => setEditing({ ...editing, reps: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => saveEdit(true)}>
                + offene Sätze
              </Button>
              <Button onClick={() => saveEdit(false)}>Speichern</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Training verwerfen?">
        <p className="mb-3 text-sys-muted">Alle Sätze dieses Trainings werden gelöscht.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            Nein
          </Button>
          <Button variant="danger" onClick={onCancel}>
            Verwerfen
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
