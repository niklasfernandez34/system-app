import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, Chips, NumberInput, SystemWindow } from '../components/ui'
import type { BodyRecord } from '../db/db'
import { BODY_FIELDS, bodyChange, lastKnown, saveBody, useBody, type BodyKey, type BodyValues } from '../lib/body'
import { fmt } from '../lib/sport'
import { PlanCheckDialog } from '../components/PlanCheckDialog'
import { useSetting } from '../db/settings'
import type { PlanCheck } from '../lib/calorieCalc'
import { runPlanCheck } from '../lib/nutritionPlan'

export function BodyPage() {
  const data = useBody()
  const [check, setCheck] = useState<PlanCheck | null>(null)
  const kcalGoal = useSetting('kcalGoal')
  if (!data) return null
  const todayEntry = data.entries.find((e) => e.day === data.today)
  return (
    <div className="space-y-4">
      <BodyForm
        key={todayEntry?.updatedAt ?? 'neu'}
        entries={data.entries}
        todayEntry={todayEntry}
        onSaved={async () => setCheck(await runPlanCheck())}
      />
      <BodyChart entries={data.entries} today={data.today} />
      <PlanCheckDialog check={check} currentKcal={kcalGoal} onClose={() => setCheck(null)} />
    </div>
  )
}

function BodyForm({ entries, todayEntry, onSaved }: { entries: BodyRecord[]; todayEntry?: BodyRecord; onSaved: () => void }) {
  const [values, setValues] = useState<BodyValues>(() => (todayEntry ? lastKnown([todayEntry]) : lastKnown(entries)))
  const known = lastKnown(entries)
  const hidden = BODY_FIELDS.filter((f) => values[f.key] === undefined)

  return (
    <SystemWindow title={todayEntry ? 'Heute eingetragen' : 'Heute eintragen'}>
      <div className="space-y-3">
        {BODY_FIELDS.filter((f) => values[f.key] !== undefined).map((f) => (
          <div key={f.key} className="flex items-end gap-2">
            <div className="flex-1">
              <NumberInput
                label={f.label}
                unit={f.unit}
                step={f.step}
                min={0}
                value={values[f.key]!}
                onChange={(v) => setValues({ ...values, [f.key]: v })}
              />
            </div>
            <Button variant="ghost" className="px-3" onClick={() => setValues({ ...values, [f.key]: undefined })}>
              ×
            </Button>
          </div>
        ))}
        {hidden.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hidden.map((f) => (
              <Button
                key={f.key}
                variant="ghost"
                className="min-h-9 py-1 text-sm"
                onClick={() => setValues({ ...values, [f.key]: known[f.key] ?? f.start })}
              >
                + {f.label}
              </Button>
            ))}
          </div>
        )}
        <Button className="w-full" disabled={!Object.values(values).some((v) => v !== undefined)} onClick={async () => {
            await saveBody(values)
            if (values.weight !== undefined) onSaved()
          }}
        >
          Speichern
        </Button>
      </div>
    </SystemWindow>
  )
}

function BodyChart({ entries, today }: { entries: BodyRecord[]; today: string }) {
  const available = BODY_FIELDS.filter((f) => entries.some((e) => e[f.key] !== undefined))
  const [key, setKey] = useState<BodyKey>('weight')
  const field = available.find((f) => f.key === key) ?? available[0]
  if (!field) {
    return (
      <SystemWindow title="Verlauf">
        <p className="text-center text-sys-muted">Noch keine Werte eingetragen.</p>
      </SystemWindow>
    )
  }
  const change = bodyChange(entries, field.key, today)!
  const byLabel = new Map(available.map((f) => [f.label, f.key]))
  const sign = (n: number) => `${n > 0 ? '+' : ''}${fmt(n)} ${field.unit}`

  return (
    <SystemWindow title="Verlauf">
      <div className="space-y-3">
        {available.length > 1 && (
          <Chips
            options={available.map((f) => f.label)}
            value={field.label}
            onChange={(l) => setKey(byLabel.get(l)!)}
          />
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Aktuell" value={`${fmt(change.last)} ${field.unit}`} />
          <Stat label="30 Tage" value={sign(change.last30)} />
          <Stat label="Gesamt" value={sign(change.total)} />
        </div>
        {change.points.length > 1 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={change.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--color-sys-line)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d: string) => format(parseISO(d), 'd.M.')}
                  stroke="var(--color-sys-muted)"
                  fontSize={11}
                />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="var(--color-sys-muted)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-sys-panel)', border: '1px solid var(--color-sys-glow)' }}
                  labelFormatter={(d) => format(parseISO(String(d)), 'd.M.yyyy')}
                  formatter={(v) => [`${fmt(Number(v))} ${field.unit}`, field.label]}
                />
                <Line type="monotone" dataKey="value" stroke="var(--color-sys-glow)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-xs text-sys-muted">Das Diagramm erscheint ab dem zweiten Eintrag.</p>
        )}
      </div>
    </SystemWindow>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sys-line p-2">
      <div className="text-xs text-sys-muted">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
