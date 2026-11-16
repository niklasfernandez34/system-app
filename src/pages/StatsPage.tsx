import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Chips, ProgressBar, SystemWindow } from '../components/ui'
import { setSetting, useSetting } from '../db/settings'
import { useStatsData } from '../lib/statsData'
import {
  AREAS,
  METRICS,
  NEUTRAL_TREND,
  RANGES,
  aggregate,
  buckets,
  fmtMetric,
  reviewWeek,
  series,
  weekReview,
  type Area,
  type DayValues,
  type MetricKey,
  type Range,
} from '../lib/stats'

const earliest = (today: string, range: Range) => {
  const a = buckets(today, range)[0].days[0]
  const b = reviewWeek(today).prev[0]
  return a < b ? a : b
}
const FROM: Record<Range, (today: string) => string> = {
  '4 Wochen': (t) => earliest(t, '4 Wochen'),
  '3 Monate': (t) => earliest(t, '3 Monate'),
  '1 Jahr': (t) => earliest(t, '1 Jahr'),
}

const AREA_NAMES = Object.keys(AREAS) as Area[]

export function StatsPage() {
  const [range, setRange] = useState<Range>('4 Wochen')
  const data = useStatsData(FROM[range])
  if (!data) return null
  return (
    <div className="space-y-4">
      <WeekReview today={data.today} daily={data.daily} />
      <SystemWindow title="Statistiken">
        <div className="space-y-3">
          <Chips options={RANGES} value={range} onChange={setRange} label="Zeitraum" />
          <StatsChart today={data.today} range={range} daily={data.daily} />
        </div>
      </SystemWindow>
      <StudyBySubject today={data.today} range={range} events={data.events} subjects={data.subjects} />
    </div>
  )
}

type Daily = Map<string, DayValues>

function WeekReview({ today, daily }: { today: string; daily: Daily }) {
  const week = reviewWeek(today)
  const seen = useSetting('reviewSeenWeek')
  useEffect(() => {
    if (seen !== week.start) setSetting('reviewSeenWeek', week.start)
  }, [seen, week.start])
  const rows = weekReview(daily, week).filter((r) => r.value || r.prev)
  const span = `${format(parseISO(week.start), 'd.M.')} – ${format(parseISO(week.end), 'd. MMMM', { locale: de })}`
  return (
    <SystemWindow title="Wochenrückblick">
      <p className="mb-3 text-center text-sm text-sys-muted">{span}</p>
      {rows.length === 0 ? (
        <p className="text-center text-sm text-sys-muted">In dieser Woche gibt es noch keine Einträge.</p>
      ) : (
        <div className="divide-y divide-sys-line">
          <div className="flex justify-between pb-1 text-xs text-sys-muted">
            <span>Woche</span>
            <span>Vorwoche</span>
          </div>
          {rows.map(({ metric, value, prev }) => {
            const diff = value !== null && prev !== null ? value - prev : 0
            const neutral = NEUTRAL_TREND.includes(metric.key)
            const color = !diff || neutral ? 'text-sys-muted' : diff > 0 ? 'text-emerald-400' : 'text-red-400'
            return (
              <div key={metric.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{metric.label}</span>
                <span className="flex items-baseline gap-2 text-right">
                  <span className="font-semibold">{fmtMetric(value, metric)}</span>
                  <span className={`w-24 text-xs ${color}`}>
                    {diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {fmtMetric(prev, metric)}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </SystemWindow>
  )
}

function StatsChart({ today, range, daily }: { today: string; range: Range; daily: Daily }) {
  const [area, setArea] = useState<Area>('XP')
  const [picked, setPicked] = useState<MetricKey>('xp')
  const keys: readonly MetricKey[] = AREAS[area]
  const key = keys.includes(picked) ? picked : keys[0]
  const metric = METRICS[key]
  const list = buckets(today, range)
  const points = series(daily, list, key)
  const allDays = list.flatMap((b) => b.days)
  const total = aggregate(daily, allDays, key)
  const filled = points.filter((p) => p.value !== null)
  const best = filled.length ? Math.max(...filled.map((p) => p.value!)) : null
  const byLabel = new Map(keys.map((k) => [METRICS[k].label, k]))
  const tooltip = {
    contentStyle: { background: 'var(--color-sys-panel)', border: '1px solid var(--color-sys-glow)' },
    formatter: (v: unknown) => [fmtMetric(Number(v), metric), metric.label] as [string, string],
  }
  const axis = { stroke: 'var(--color-sys-muted)', fontSize: 11 }
  return (
    <>
      <Chips options={AREA_NAMES} value={area} onChange={setArea} label="Bereich" />
      {keys.length > 1 && (
        <Chips options={keys.map((k) => METRICS[k].label)} value={metric.label} onChange={(l) => setPicked(byLabel.get(l)!)} />
      )}
      <div className="grid grid-cols-2 gap-2 text-center">
        <Stat label={metric.kind === 'sum' ? 'Gesamt' : 'Schnitt'} value={fmtMetric(total, metric)} />
        <Stat label={range === '4 Wochen' ? 'Bester Tag' : range === '3 Monate' ? 'Beste Woche' : 'Bester Monat'} value={fmtMetric(best, metric)} />
      </div>
      {filled.length === 0 || (metric.kind === 'sum' && !total) ? (
        <p className="py-6 text-center text-xs text-sys-muted">Für diesen Zeitraum gibt es noch keine Daten.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            {metric.kind === 'sum' ? (
              <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--color-sys-line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={12} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip {...tooltip} cursor={{ fill: 'var(--color-sys-line)', opacity: 0.4 }} />
                <Bar dataKey="value" fill="var(--color-sys-glow)" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--color-sys-line)" strokeDasharray="3 3" />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={12} />
                <YAxis {...axis} domain={['auto', 'auto']} allowDecimals={false} />
                <Tooltip {...tooltip} />
                <Line type="monotone" dataKey="value" stroke="var(--color-sys-glow)" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}

type StudyEvent = { type: string; day: string; data?: Record<string, unknown> }

function StudyBySubject({ today, range, events, subjects }: { today: string; range: Range; events: StudyEvent[]; subjects: { id: number; name: string }[] }) {
  const start = buckets(today, range)[0].days[0]
  const minutes = new Map<number, number>()
  for (const e of events)
    if (e.type === 'study_session' && e.day >= start) {
      const id = Number(e.data?.subjectId)
      minutes.set(id, (minutes.get(id) ?? 0) + Number(e.data?.minutes ?? 0))
    }
  if (!minutes.size) return null
  const max = Math.max(...minutes.values())
  const rows = [...minutes].sort((a, b) => b[1] - a[1])
  const name = (id: number) => subjects.find((s) => s.id === id)?.name ?? 'Gelöschtes Fach'
  return (
    <SystemWindow title="Lernzeit pro Fach">
      <div className="space-y-2">
        {rows.map(([id, min]) => (
          <div key={id}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{name(id)}</span>
              <span className="text-sys-muted">{fmtMetric(min, METRICS.studyMin)}</span>
            </div>
            <ProgressBar value={min} max={max} />
          </div>
        ))}
      </div>
    </SystemWindow>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-sys-line p-2">
      <div className="text-xs text-sys-muted">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
