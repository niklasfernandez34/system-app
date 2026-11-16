import { useState } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, DateInput, NumberInput, ProgressBar, SystemWindow, TextField } from './ui'
import { XP } from '../config/xp'
import { db, type PlanTask } from '../db/db'
import { currentDay } from '../lib/events'
import { deletePlan, savePlan, togglePlanTask, usePlan } from '../lib/studyPlans'

type Form = { examDay: string; topics: string; repeatDays: number }

export function StudyPlan({ subjectId }: { subjectId: number }) {
  const plan = usePlan(subjectId)
  const today = useLiveQuery(() => currentDay())
  const exam = useLiveQuery(
    () => db.bosses.filter((b) => b.kind === 'exam' && b.status === 'active' && b.subjectId === subjectId).first(),
    [subjectId],
  )
  const [form, setForm] = useState<Form | null>(null)

  if (plan === undefined || !today) return null

  const newForm = (): Form =>
    plan
      ? { examDay: plan.examDay, topics: plan.topics.join('\n'), repeatDays: plan.repeatDays }
      : { examDay: exam?.deadline ?? format(addDays(parseISO(today), 30), 'yyyy-MM-dd'), topics: '', repeatDays: 2 }

  if (form || !plan) {
    const f = form ?? newForm()
    const topics = f.topics.split('\n').map((t) => t.trim()).filter(Boolean)
    const days = differenceInCalendarDays(parseISO(f.examDay), parseISO(today))
    return (
      <SystemWindow title={plan ? 'Lernplan ändern' : 'Lernplan erstellen'}>
        <div className="space-y-3">
          <DateInput label="Klausurtermin" min={format(addDays(parseISO(today), 1), 'yyyy-MM-dd')} value={f.examDay} onChange={(examDay) => setForm({ ...f, examDay })} />
          {exam && exam.deadline !== f.examDay && (
            <button type="button" className="text-xs text-sys-muted underline" onClick={() => setForm({ ...f, examDay: exam.deadline })}>
              Termin vom Klausur-Boss übernehmen ({format(parseISO(exam.deadline), 'd.M.yyyy')})
            </button>
          )}
          <TextField
            label="Themen (eins pro Zeile)"
            multiline
            rows={6}
            value={f.topics}
            onChange={(t) => setForm({ ...f, topics: t })}
            placeholder={'Kapitel 1: Grundlagen\nKapitel 2: Ableitungen\nAltklausur 2024'}
          />
          <NumberInput label="Tage zum Wiederholen vor der Klausur" min={0} max={14} value={f.repeatDays} onChange={(r) => setForm({ ...f, repeatDays: Math.round(r) })} />
          <p className="text-center text-xs text-sys-muted">
            {days > 0 ? `${topics.length} Themen auf ${Math.max(1, days - Math.min(f.repeatDays, days - 1))} Tage verteilt, danach wiederholen.` : 'Der Termin muss in der Zukunft liegen.'}
            {plan && ' Erledigte Aufgaben bleiben, der Rest wird ab heute neu verteilt.'}
          </p>
          <div className={`grid gap-2 ${plan ? 'grid-cols-2' : ''}`}>
            {plan && (
              <Button variant="ghost" onClick={() => setForm(null)}>
                Abbrechen
              </Button>
            )}
            <Button
              disabled={!topics.length || days <= 0}
              onClick={async () => {
                await savePlan(subjectId, { examDay: f.examDay, topics, repeatDays: f.repeatDays })
                setForm(null)
              }}
            >
              {plan ? 'Neu planen' : 'Plan erstellen'}
            </Button>
          </div>
        </div>
      </SystemWindow>
    )
  }

  const byDay = new Map<string, PlanTask[]>()
  for (const t of plan.tasks) byDay.set(t.day, [...(byDay.get(t.day) ?? []), t])
  const done = plan.tasks.filter((t) => t.done).length
  const left = differenceInCalendarDays(parseISO(plan.examDay), parseISO(today))

  return (
    <SystemWindow title="Lernplan">
      <p className="mb-2 text-center text-sm">
        Klausur am {format(parseISO(plan.examDay), 'EEEE, d. MMMM', { locale: de })}
        <span className="block text-xs text-sys-glow">{left > 1 ? `noch ${left} Tage` : left === 1 ? 'morgen' : left === 0 ? 'heute' : 'vorbei'}</span>
      </p>
      <ProgressBar value={done} max={plan.tasks.length} label="Erledigt" />
      <ul className="mt-4 space-y-3">
        {[...byDay].map(([day, tasks]) => (
          <li key={day}>
            <p className={`mb-1 text-xs uppercase tracking-widest ${day === today ? 'text-sys-glow' : 'text-sys-muted'}`}>
              {day === today ? 'Heute' : format(parseISO(day), 'EEE, d. MMM', { locale: de })}
            </p>
            {tasks.map((t) => (
              <PlanTaskRow key={t.id} task={t} late={day < today && !t.done && !t.repeat} onToggle={() => togglePlanTask(plan.id, t.id)} />
            ))}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-sys-muted">Jede erledigte Aufgabe: +{XP.plan_task_done} XP (Intelligenz)</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="danger" onClick={() => deletePlan(plan.id)}>
          Löschen
        </Button>
        <Button variant="ghost" onClick={() => setForm(newForm())}>
          Plan ändern
        </Button>
      </div>
    </SystemWindow>
  )
}

export function PlanTaskRow({ task, late, onToggle, sub }: { task: PlanTask; late?: boolean; onToggle: () => void; sub?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <button
        type="button"
        aria-label={task.done ? 'Als offen markieren' : 'Erledigt'}
        onClick={onToggle}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border ${task.done ? 'border-sys-glow bg-sys-glow/20 text-sys-glow' : 'border-sys-line'}`}
      >
        {task.done && '✓'}
      </button>
      <span className={`flex-1 ${task.done ? 'text-sys-muted line-through' : ''}`}>
        {task.title}
        {(sub || late) && (
          <span className="block text-xs text-sys-muted">
            {sub}
            {sub && late && ' · '}
            {late && <span className="text-sys-danger">nachholen</span>}
          </span>
        )}
      </span>
    </div>
  )
}
