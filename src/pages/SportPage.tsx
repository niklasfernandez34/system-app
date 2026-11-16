import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useNavigate } from 'react-router'
import { Button, NumberInput, SystemWindow, WeekStrip } from '../components/ui'
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

      <SystemWindow>
        <WeekStrip marked={recent?.map((w) => w.finishedAt)} />
      </SystemWindow>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => navigate('/sport/koerper')}>
          Körperdaten
        </Button>
        <Button variant="ghost" onClick={() => navigate('/sport/fotos')}>
          Fortschrittsfotos
        </Button>
      </div>

      <section>
        <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sys-muted">Trainingspläne</h2>
        {plans && !plans.length && <p className="card mb-2 p-4 text-center text-sys-muted">Noch keine Pläne angelegt.</p>}
        <ul className="mb-2 space-y-2">
          {plans?.map((p) => (
            <li key={p.id} className="card flex items-center gap-3 bg-linear-to-br from-sys-glow/20 via-sys-panel via-60% to-sys-panel p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sys-glow/20 text-sys-glow">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.name}</div>
                <div className="text-xs font-medium text-sys-muted">{p.items.length} Übungen</div>
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
      </section>

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
                <span className="font-semibold text-sys-glow">
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
