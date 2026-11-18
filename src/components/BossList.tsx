import { useState } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button, Chips, DateInput, Dialog, NumberInput, ProgressBar, SystemWindow } from './ui'
import { ExercisePicker } from './ExercisePicker'
import { XP } from '../config/xp'
import type { BossMetric, BossRecord } from '../db/db'
import { addBoss, addNutritionBoss, addRoutineBoss, bossTitle, deleteBoss, useBosses } from '../lib/bosses'
import { useHabits } from '../lib/habits'
import { useGoals, type Goals } from '../lib/nutrition'
import { fmt, useExerciseNames } from '../lib/sport'

const KINDS = ['Sport', 'Ernährung', 'Gewohnheit'] as const
const KIND_OF = { lift: 'Sport', nutrition: 'Ernährung', exam: 'Sport', routine: 'Gewohnheit' } as const
const ROUTINE_OPTIONS = [
  { id: 'evening', label: 'Abendroutine' },
  { id: 'morning', label: 'Morgenroutine' },
  { id: 'both', label: 'Beide Routinen' },
] as const
const ATTR_LABEL = { Sport: 'Stärke', Ernährung: 'Vitalität', Gewohnheit: 'Charisma' } as const
const METRICS: { metric: BossMetric; label: string; unit: string; step: number }[] = [
  { metric: 'kcal', label: 'Kalorien', unit: 'kcal', step: 50 },
  { metric: 'protein', label: 'Eiweiß', unit: 'g', step: 5 },
  { metric: 'water', label: 'Wasser', unit: 'ml', step: 250 },
]
const DIRECTIONS = ['mindestens', 'höchstens'] as const

type Draft = {
  kind: (typeof KINDS)[number]
  exerciseId?: number
  target: number
  reps: number
  deadline: string
  metric: BossMetric
  direction: 'min' | 'max'
  days: number
  what: string
}

const inDays = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd')
const countdown = (d: number) => (d > 1 ? `noch ${d} Tage` : d === 1 ? 'noch 1 Tag' : d === 0 ? 'letzter Tag' : 'abgelaufen')
const goalFor = (goals: Goals | undefined, metric: BossMetric) =>
  !goals ? 2000 : metric === 'kcal' ? goals.kcal : metric === 'protein' ? goals.protein : goals.water

type Listed = BossRecord & { name: string; best: number; goal: number; daysLeft: number }
const label = (b: Listed) => (b.kind === 'lift' ? `${b.name} ${fmt(b.target)} kg × ${b.reps}` : b.name)

type ListProps = { compact?: boolean; only?: BossRecord['kind'] }

export function BossList({ compact = false, only }: ListProps) {
  const all = useBosses()
  const bosses = all?.filter((b) => b.kind !== 'exam' && (!only || b.kind === only))
  const habits = useHabits()?.filter((h) => !h.archived)
  const names = useExerciseNames()
  const goals = useGoals()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [picking, setPicking] = useState(false)
  const [showDone, setShowDone] = useState(false)

  if (!bosses) return null
  const active = bosses.filter((b) => b.status === 'active')
  const done = bosses.filter((b) => b.status !== 'active').reverse()

  if (compact) {
    if (!active.length) return null
    return (
      <SystemWindow title="Bosse">
        <ul className="space-y-3">
          {active.map((b) => (
            <li key={b.id}>
              <p className="mb-1 flex justify-between gap-2 text-sm">
                <span>{label(b)}</span>
                <span className="shrink-0 text-sys-muted">{countdown(b.daysLeft)}</span>
              </p>
              <ProgressBar value={b.best} max={b.goal} />
            </li>
          ))}
        </ul>
      </SystemWindow>
    )
  }

  const fresh = (kind: Draft['kind'] = only ? KIND_OF[only] : 'Sport'): Draft => ({
    kind,
    target: kind === 'Sport' ? 50 : goalFor(goals, 'kcal'),
    reps: 1,
    deadline: inDays(kind === 'Ernährung' ? 12 : 30),
    what: 'evening',
    metric: 'kcal',
    direction: goals?.mode === 'lose' ? 'max' : 'min',
    days: kind === 'Gewohnheit' ? 20 : 10,
  })

  const retry = (b: Listed): Draft =>
    b.kind === 'routine'
      ? { ...fresh('Gewohnheit'), what: b.habitId ? `h${b.habitId}` : (b.routine ?? 'evening'), days: b.days ?? 20 }
      : b.kind === 'nutrition'
      ? {
          ...fresh('Ernährung'),
          target: b.target,
          metric: b.metric ?? 'kcal',
          direction: b.direction ?? 'min',
          days: b.days ?? 10,
          deadline: inDays(Math.max(b.days ?? 10, differenceInCalendarDays(parseISO(b.deadline), parseISO(b.startDay ?? b.deadline)) + 1)),
        }
      : { ...fresh('Sport'), exerciseId: b.exerciseId, target: b.target, reps: b.reps }

  const span = draft ? differenceInCalendarDays(parseISO(draft.deadline), parseISO(inDays(0))) + 1 : 0
  const nutrition = draft?.kind === 'Ernährung'
  const routine = draft?.kind === 'Gewohnheit'
  const whatOptions = [...ROUTINE_OPTIONS.map((o) => ({ id: o.id as string, label: o.label })), ...(habits ?? []).map((h) => ({ id: `h${h.id}`, label: h.name }))]
  const valid =
    draft &&
    (routine
      ? draft.days >= 1 && draft.days <= span
      : nutrition
        ? draft.target > 0 && draft.days >= 1 && draft.days <= span
        : !!draft.exerciseId && draft.target > 0)
  const metricInfo = METRICS.find((m) => m.metric === draft?.metric) ?? METRICS[0]

  const save = async () => {
    if (!draft || !valid) return
    if (routine) {
      const habitId = draft.what.startsWith('h') ? Number(draft.what.slice(1)) : undefined
      await addRoutineBoss({ habitId, routine: habitId ? undefined : (draft.what as 'morning' | 'evening' | 'both'), days: draft.days, deadline: draft.deadline })
    } else if (nutrition) {
      await addNutritionBoss({
        metric: draft.metric,
        direction: draft.metric === 'kcal' ? draft.direction : 'min',
        target: draft.target,
        days: draft.days,
        deadline: draft.deadline,
      })
    } else {
      await addBoss({ exerciseId: draft.exerciseId!, target: draft.target, reps: draft.reps, deadline: draft.deadline })
    }
    setDraft(null)
  }

  return (
    <div className="space-y-4">
      {!active.length && <p className="text-center text-sys-muted">Kein aktiver Boss.</p>}
      <ul className="space-y-4">
        {active.map((b) => (
          <li key={b.id} className="space-y-1">
            <p className="flex justify-between gap-2 font-semibold">
              <span>{label(b)}</span>
              <span className="shrink-0 text-sm text-sys-glow">{countdown(b.daysLeft)}</span>
            </p>
            <ProgressBar value={b.best} max={b.goal} label={b.kind === 'lift' ? 'Bestes Gewicht seit Start (kg)' : 'Geschaffte Tage'} />
            <button type="button" className="text-xs text-sys-muted underline" onClick={() => deleteBoss(b.id)}>
              Aufgeben
            </button>
          </li>
        ))}
      </ul>
      <Button className="w-full" onClick={() => setDraft(fresh())}>
        Neuer Boss
      </Button>
      {done.length > 0 && (
        <Button variant="ghost" className="w-full" onClick={() => setShowDone(!showDone)}>
          {showDone ? 'Vergangene ausblenden' : `Vergangene Bosse (${done.length})`}
        </Button>
      )}
      {showDone && (
        <ul className="space-y-2">
          {done.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={b.status === 'won' ? 'text-sys-glow' : 'text-sys-danger'}>
                {b.status === 'won' ? '✓' : '✗'} {label(b)}
              </span>
              {b.status === 'lost' && (
                <Button variant="ghost" onClick={() => setDraft(retry(b))}>
                  Erneut
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!draft} onClose={() => setDraft(null)} title="Neuer Boss">
        {draft && (
          <div className="space-y-3">
            {!only && <Chips options={KINDS} value={draft.kind} onChange={(kind) => setDraft(fresh(kind))} />}
            {routine ? (
              <>
                <Chips
                  label="Was"
                  options={whatOptions.map((o) => o.label)}
                  value={whatOptions.find((o) => o.id === draft.what)?.label ?? ''}
                  onChange={(l) => setDraft({ ...draft, what: whatOptions.find((o) => o.label === l)!.id })}
                />
                <NumberInput label="Anzahl Tage" min={1} max={365} value={draft.days} onChange={(days) => setDraft({ ...draft, days: Math.round(days) })} />
              </>
            ) : nutrition ? (
              <>
                <Chips
                  label="Wert"
                  options={METRICS.map((m) => m.label)}
                  value={metricInfo.label}
                  onChange={(l) => {
                    const metric = METRICS.find((m) => m.label === l)!.metric
                    setDraft({ ...draft, metric, target: goalFor(goals, metric) })
                  }}
                />
                {draft.metric === 'kcal' && (
                  <Chips
                    options={DIRECTIONS}
                    value={draft.direction === 'max' ? 'höchstens' : 'mindestens'}
                    onChange={(d) => setDraft({ ...draft, direction: d === 'höchstens' ? 'max' : 'min' })}
                  />
                )}
                <NumberInput
                  label="Pro Tag"
                  unit={metricInfo.unit}
                  step={metricInfo.step}
                  min={0}
                  value={draft.target}
                  onChange={(target) => setDraft({ ...draft, target })}
                />
                <NumberInput
                  label="Anzahl Tage"
                  min={1}
                  max={365}
                  value={draft.days}
                  onChange={(days) => setDraft({ ...draft, days: Math.round(days) })}
                />
              </>
            ) : (
              <>
                <Button variant="ghost" className="w-full" onClick={() => setPicking(true)}>
                  {draft.exerciseId ? names?.get(draft.exerciseId) : 'Übung wählen'}
                </Button>
                <NumberInput
                  label="Zielgewicht"
                  unit="kg"
                  step={2.5}
                  min={0}
                  value={draft.target}
                  onChange={(target) => setDraft({ ...draft, target })}
                />
                <NumberInput
                  label="Wiederholungen"
                  step={1}
                  min={1}
                  value={draft.reps}
                  onChange={(reps) => setDraft({ ...draft, reps })}
                />
              </>
            )}
            <DateInput
              label="Termin"
              min={inDays(1)}
              value={draft.deadline}
              onChange={(deadline) => setDraft({ ...draft, deadline })}
            />
            {routine && (
              <p className={`text-center text-sm ${draft.days > span ? 'text-sys-danger' : 'text-sys-glow'}`}>
                {draft.days > span
                  ? `Bis zum Termin sind es nur ${span} Tage.`
                  : `${draft.days} × ${whatOptions.find((o) => o.id === draft.what)?.label} in ${span} Tagen`}
              </p>
            )}
            {nutrition && (
              <p className={`text-center text-sm ${draft.days > span ? 'text-sys-danger' : 'text-sys-glow'}`}>
                {draft.days > span
                  ? `Bis zum Termin sind es nur ${span} Tage.`
                  : `${bossTitle({ ...draft, kind: 'nutrition', direction: draft.metric === 'kcal' ? draft.direction : 'min' })} in ${span} Tagen`}
              </p>
            )}
            {nutrition && draft.direction === 'max' && draft.metric === 'kcal' && (
              <p className="text-center text-xs text-sys-muted">Ein Tag zählt erst, wenn er vorbei ist und etwas eingetragen wurde.</p>
            )}
            <p className="text-center text-xs text-sys-muted">
              {`Sieg bis ${format(parseISO(draft.deadline), 'd. MMMM yyyy', { locale: de })}: +${XP.boss_defeated} XP`}
              {` (${routine && draft.what.startsWith('h') ? 'Willenskraft' : ATTR_LABEL[draft.kind]})`}
            </p>
            <Button className="w-full" disabled={!valid} onClick={save}>
              Herausfordern
            </Button>
          </div>
        )}
      </Dialog>
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(exerciseId) => {
          setPicking(false)
          setDraft((d) => d && { ...d, exerciseId })
        }}
      />
    </div>
  )
}
