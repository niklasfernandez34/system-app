import { useState } from 'react'
import { useNavigate } from 'react-router'
import { RestTimer } from '../components/RestTimer'
import { ExerciseInfo } from '../components/ExerciseInfo'
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
              <li key={i} className="rounded-xl border border-sys-glow bg-sys-glow/10 p-2 text-center">
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
  const [infoId, setInfoId] = useState<number | null>(null)
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
      <header className="px-1 pt-2">
        <h1 className="text-[22px] font-extrabold uppercase tracking-wide">{title}</h1>
        <p className="mt-0.5 text-xs font-medium text-sys-muted">
          {doneCount} / {total} Sätze erledigt
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sys-raised">
          <div className="h-full rounded-full bg-sys-glow transition-[width] duration-500" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
        </div>
      </header>

      {entries.map((entry, e) => {
        const next = entry.sets.findIndex((x) => !x.done)
        return (
          <section key={e} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-sys-muted">
                  Übung {e + 1} / {entries.length}
                </p>
                <h2 className="text-lg font-bold">{names?.get(entry.exerciseId) ?? '?'}</h2>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sys-raised text-sm text-sys-muted"
                onClick={() => setInfoId(entry.exerciseId)}
                aria-label="Infos"
              >
                ⓘ
              </button>
            </div>
            {entry.lastWeight !== undefined && (
              <p className="mt-1 text-xs font-medium text-sys-muted">
                Letztes Mal {fmt(entry.lastWeight)} kg
                {entry.sets[0] && entry.sets[0].weight > entry.lastWeight && (
                  <span className="text-sys-glow"> · heute mehr ↑</span>
                )}
              </p>
            )}
            <div className="mt-3 grid grid-cols-[2.5rem_1fr_1fr_2.75rem] items-center text-center">
              <span className="py-1 text-[11px] font-bold tracking-wider text-sys-muted">SATZ</span>
              <span className="py-1 text-[11px] font-bold tracking-wider text-sys-muted">WDH</span>
              <span className="py-1 text-[11px] font-bold tracking-wider text-sys-muted">KG</span>
              <span />
              {entry.sets.map((set, s) => {
                const cur = s === next
                const row = cur ? 'bg-sys-raised' : ''
                const tone = set.done || cur ? 'text-sys-text' : 'text-[#5c5c63]'
                const edit = () => setEditing({ e, s, weight: set.weight, reps: set.reps })
                return [
                  <span key={`n${s}`} className={`rounded-l-xl py-2.5 text-lg font-bold ${row} ${tone}`}>
                    {s + 1}
                  </span>,
                  <button key={`r${s}`} type="button" onClick={edit} className={`py-2.5 text-lg font-bold ${row} ${tone}`}>
                    {set.reps}
                  </button>,
                  <button key={`w${s}`} type="button" onClick={edit} className={`py-2.5 text-lg font-bold ${row} ${tone}`}>
                    {fmt(set.weight)}
                  </button>,
                  <span key={`c${s}`} className={`flex justify-center rounded-r-xl py-1.5 ${row}`}>
                    <button
                      type="button"
                      onClick={() => toggle(e, s)}
                      aria-label={`Satz ${s + 1} abhaken`}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${
                        set.done ? 'bg-sys-ok text-black' : 'border-2 border-[#3a3a41]'
                      }`}
                    >
                      {set.done ? '✓' : ''}
                    </button>
                  </span>,
                ]
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="ghost" disabled={!entry.sets.length} onClick={() => removeSet(e)}>
                − Satz
              </Button>
              <Button variant="ghost" onClick={() => addSet(e)}>
                + Satz
              </Button>
            </div>
          </section>
        )
      })}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" onClick={() => setConfirmCancel(true)}>
          Verwerfen
        </Button>
        <Button disabled={!doneCount} onClick={onFinish}>
          Beenden
        </Button>
      </div>

      {workout.restEndsAt && (
        <div className="sticky bottom-28 z-10">
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

      <ExerciseInfo exerciseId={infoId} onClose={() => setInfoId(null)} />

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
