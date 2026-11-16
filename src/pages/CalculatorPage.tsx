import { addDays, format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Chips, DateInput, NumberInput, SystemWindow } from '../components/ui'
import { getSetting } from '../db/settings'
import {
  ACTIVITY,
  bmr,
  GOAL_MODES,
  goalsFor,
  rateForTarget,
  rateWarning,
  tdeeOf,
  type GoalMode,
  type NutritionPlan,
} from '../lib/calorieCalc'
import { currentDay } from '../lib/events'
import { fmtNum } from '../lib/nutrition'
import { applyPlan, useLatestWeight } from '../lib/nutritionPlan'

export function CalculatorPage() {
  const data = useLiveQuery(async () => ({ today: await currentDay(), plan: await getSetting('nutritionPlan') }))
  const weight = useLatestWeight()
  if (!data || weight === undefined) return null
  return <CalculatorForm today={data.today} plan={data.plan} lastWeight={weight} />
}

const MODE_LABELS = GOAL_MODES.map((m) => m.label)
const HOW = ['Pro Woche', 'Zielgewicht bis Datum'] as const
const SEX = ['Mann', 'Frau'] as const
const fmt1 = (n: number) => (Math.round(n * 100) / 100).toLocaleString('de-DE')
const fmtDay = (d: string) => format(parseISO(d), 'd. MMMM yyyy', { locale: de })

function CalculatorForm({ today, plan, lastWeight }: { today: string; plan: NutritionPlan | null; lastWeight: number | null }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<GoalMode>(plan?.mode ?? 'lose')
  const [how, setHow] = useState<(typeof HOW)[number]>(plan?.targetDate ? HOW[1] : HOW[0])
  const [rateAbs, setRateAbs] = useState(plan && plan.rate && !plan.targetDate ? Math.abs(plan.rate) : 0.5)
  const [targetWeight, setTargetWeight] = useState(plan?.targetWeight ?? Math.round((lastWeight ?? 75) - 5))
  const [targetDate, setTargetDate] = useState(
    plan?.targetDate && plan.targetDate > today ? plan.targetDate : format(addDays(parseISO(today), 84), 'yyyy-MM-dd'),
  )
  const [sex, setSex] = useState<'m' | 'f'>(plan?.sex ?? 'm')
  const [age, setAge] = useState(plan?.age ?? 25)
  const [height, setHeight] = useState(plan?.height ?? 180)
  const [weight, setWeight] = useState(lastWeight ?? 75)
  const [activity, setActivity] = useState(plan?.activity ?? 2)

  const byDate = mode !== 'keep' && how === HOW[1]
  const rate = mode === 'keep' ? 0 : byDate ? rateForTarget(weight, targetWeight, today, targetDate) : mode === 'lose' ? -rateAbs : rateAbs
  const wrongWay = byDate && (mode === 'lose' ? rate >= 0 : rate <= 0)
  const profile = { sex, age, height, weight, activity }
  const tdee = tdeeOf(profile)
  const goals = goalsFor(tdee, rate, weight, sex, mode)
  const warning = rateWarning(rate, weight)

  const save = async () => {
    await applyPlan(
      {
        mode,
        rate,
        sex,
        age,
        height,
        activity,
        targetWeight: byDate ? targetWeight : undefined,
        targetDate: byDate ? targetDate : undefined,
        tdee: Math.round(tdee),
        kcal: goals.kcal,
      },
      goals,
    )
    navigate(-1)
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Ziel">
        <div className="space-y-3">
          <Chips
            options={MODE_LABELS}
            value={GOAL_MODES.find((m) => m.mode === mode)!.label}
            onChange={(l) => setMode(GOAL_MODES.find((m) => m.label === l)!.mode)}
          />
          {mode !== 'keep' && (
            <>
              <Chips options={HOW} value={how} onChange={setHow} />
              {byDate ? (
                <div className="space-y-3">
                  <NumberInput label="Zielgewicht" unit="kg" step={0.5} min={30} value={targetWeight} onChange={setTargetWeight} />
                  <DateInput label="Bis" value={targetDate} min={today} onChange={setTargetDate} />
                </div>
              ) : (
                <NumberInput
                  label={mode === 'lose' ? 'Abnehmen pro Woche' : 'Zunehmen pro Woche'}
                  unit="kg"
                  step={0.05}
                  min={0.05}
                  max={1.5}
                  value={rateAbs}
                  onChange={setRateAbs}
                />
              )}
            </>
          )}
        </div>
      </SystemWindow>

      <SystemWindow title="Über dich">
        <div className="space-y-3">
          <Chips options={SEX} value={sex === 'm' ? 'Mann' : 'Frau'} onChange={(s) => setSex(s === 'Mann' ? 'm' : 'f')} />
          <div className="space-y-3">
            <NumberInput label="Alter" unit="Jahre" min={14} max={100} value={age} onChange={setAge} />
            <NumberInput label="Größe" unit="cm" min={120} max={230} value={height} onChange={setHeight} />
          </div>
          <NumberInput label="Gewicht" unit="kg" step={0.1} min={30} max={300} value={weight} onChange={setWeight} />
          <p className="text-xs text-sys-muted">
            {lastWeight ? 'Aus deinen Körperdaten (letzter Eintrag).' : 'Tipp: Trag dein Gewicht unter Sport → Körper ein, dann wird es übernommen.'}
          </p>
          <div className="space-y-2">
            <span className="block text-xs text-sys-muted">Aktivität (inkl. Training)</span>
            {ACTIVITY.map((a, i) => (
              <Button key={a.label} variant={i === activity ? 'primary' : 'ghost'} className="w-full text-left" onClick={() => setActivity(i)}>
                <span className="block">{a.label}</span>
                <span className="block text-xs font-normal text-sys-muted">{a.hint}</span>
              </Button>
            ))}
          </div>
        </div>
      </SystemWindow>

      <SystemWindow title="Ergebnis">
        {wrongWay ? (
          <p className="text-center text-sys-danger">
            Das Zielgewicht passt nicht zu „{GOAL_MODES.find((m) => m.mode === mode)!.label}“.
          </p>
        ) : (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-sys-muted">Grundumsatz</dt>
              <dd className="text-right">{fmtNum(bmr(profile))} kcal</dd>
              <dt className="text-sys-muted">Gesamtumsatz</dt>
              <dd className="text-right">{fmtNum(tdee)} kcal</dd>
              <dt className="text-sys-muted">Tempo</dt>
              <dd className="text-right">{rate === 0 ? 'Gewicht halten' : `${rate > 0 ? '+' : '−'}${fmt1(Math.abs(rate))} kg/Woche`}</dd>
              {byDate && (
                <>
                  <dt className="text-sys-muted">Ziel erreicht</dt>
                  <dd className="text-right">{fmtDay(targetDate)}</dd>
                </>
              )}
            </dl>
            <div className="rounded-md border border-sys-glow/40 p-3 text-center">
              <div className="text-3xl font-bold text-sys-glow">{fmtNum(goals.kcal)} kcal</div>
              <div className="mt-1 text-sm text-sys-muted">
                Eiweiß {goals.protein} g · Kohlenh. {goals.carbs} g · Fett {goals.fat} g
              </div>
              <div className="text-sm text-sys-muted">Wasser {fmtNum(goals.water)} ml</div>
            </div>
            {warning && <p className="text-sm text-sys-danger">⚠ {warning}</p>}
            {goals.floored && (
              <p className="text-sm text-sys-danger">⚠ Auf das Minimum von {fmtNum(goals.kcal)} kcal angehoben.</p>
            )}
            <p className="text-xs text-sys-muted">
              Nach 2 Wochen prüft die App beim Wiegen, ob dein Gewicht wie geplant läuft, und schlägt bei Bedarf neue Werte vor.
            </p>
          </div>
        )}
      </SystemWindow>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Abbrechen
        </Button>
        <Button disabled={wrongWay} onClick={save}>
          Übernehmen
        </Button>
      </div>
    </div>
  )
}
