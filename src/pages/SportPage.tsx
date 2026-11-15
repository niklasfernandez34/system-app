import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useNavigate } from 'react-router'
import { Button, NumberInput, SystemWindow } from '../components/ui'
import { setSetting, useSetting } from '../db/settings'
import {
  fmt,
  startWorkout,
  useBests,
  useExerciseNames,
  usePlanNames,
  usePlans,
  useRecentWorkouts,
  useRunningWorkout,
} from '../lib/sport'

export function SportPage() {
  const navigate = useNavigate()
  const plans = usePlans()
  const running = useRunningWorkout()
  const recent = useRecentWorkouts()
  const bests = useBests()
  const names = useExerciseNames()
  const restSeconds = useSetting('restSeconds')
  const increment = useSetting('weightIncrement')
  const planNames = usePlanNames()
  const planName = (id: number) => planNames?.get(id) ?? 'Training'

  const start = async (planId: number) => {
    await startWorkout(planId)
    navigate('/sport/training')
  }

  return (
    <div className="space-y-4">
      {running && (
        <SystemWindow title="Training läuft">
          <p className="mb-3 text-center">{planName(running.planId)}</p>
          <Button className="w-full" onClick={() => navigate('/sport/training')}>
            Fortsetzen
          </Button>
        </SystemWindow>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => navigate('/sport/koerper')}>
          Körperdaten
        </Button>
        <Button variant="ghost" onClick={() => navigate('/sport/fotos')}>
          Fortschrittsfotos
        </Button>
      </div>

      <SystemWindow title="Trainingspläne">
        {plans && !plans.length && <p className="mb-3 text-center text-sys-muted">Noch keine Pläne angelegt.</p>}
        <ul className="mb-3 divide-y divide-sys-line">
          {plans?.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-2">
              <div className="flex-1">
                <div>{p.name}</div>
                <div className="text-xs text-sys-muted">{p.items.length} Übungen</div>
              </div>
              <Button variant="ghost" className="px-3" onClick={() => navigate(`/sport/plan/${p.id}`)}>
                ✎
              </Button>
              <Button disabled={!p.items.length || (!!running && running.planId !== p.id)} onClick={() => start(p.id)}>
                Start
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" className="w-full" onClick={() => navigate('/sport/plan/neu')}>
          + Neuer Plan
        </Button>
      </SystemWindow>

      <SystemWindow title="Letzte Trainings">
        {recent && !recent.length && <p className="text-center text-sys-muted">Noch kein Training abgeschlossen.</p>}
        <ul className="divide-y divide-sys-line">
          {recent?.map((w) => {
            const sets = w.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
            const minutes = Math.round((w.finishedAt - w.startedAt) / 60000)
            return (
              <li key={w.id} className="flex justify-between py-2 text-sm">
                <span>
                  {format(w.finishedAt, 'EEE d. MMM', { locale: de })} · {planName(w.planId)}
                </span>
                <span className="text-sys-muted">
                  {sets} Sätze · {minutes} Min.
                </span>
              </li>
            )
          })}
        </ul>
      </SystemWindow>

      <SystemWindow title="Bestleistungen">
        {bests && !bests.size && <p className="text-center text-sys-muted">Noch keine Bestleistungen.</p>}
        <ul className="divide-y divide-sys-line">
          {bests &&
            [...bests].map(([id, b]) => (
              <li key={id} className="flex justify-between py-2 text-sm">
                <span>{names?.get(id) ?? '?'}</span>
                <span className="text-sys-glow">
                  {fmt(b.weight)} kg <span className="text-sys-muted">· 1RM ~{fmt(b.e1rm)} kg</span>
                </span>
              </li>
            ))}
        </ul>
      </SystemWindow>

      <SystemWindow title="Einstellungen">
        <div className="space-y-3">
          <NumberInput
            label="Pause nach jedem Satz"
            unit="s"
            step={15}
            min={15}
            max={600}
            value={restSeconds}
            onChange={(v) => setSetting('restSeconds', v)}
          />
          <NumberInput
            label="Gewichtssteigerung, wenn alle Sätze geschafft"
            unit="kg"
            step={0.5}
            min={0}
            max={20}
            value={increment}
            onChange={(v) => setSetting('weightIncrement', v)}
          />
        </div>
      </SystemWindow>
    </div>
  )
}
