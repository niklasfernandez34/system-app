import { addDays, format, parseISO } from 'date-fns'
import { createEvents, type DateArray, type EventAttributes } from 'ics'
import { WEEKDAYS, type CalPart, type CalendarPrefs, type Weekday } from '../config/calendar'

const BYDAY: Record<Weekday, string> = { Mo: 'MO', Di: 'TU', Mi: 'WE', Do: 'TH', Fr: 'FR', Sa: 'SA', So: 'SU' }

export type CalendarData = {
  subjects: { id: number; name: string }[]
  plans: { id: number; subjectId: number; tasks: { id: string; day: string; title: string; done?: boolean }[] }[]
  exams: { id: number; subjectId?: number; deadline: string }[]
  todos: { id: number; subjectId: number; text: string; due?: string; done: boolean }[]
  routines: ('morning' | 'evening')[]
}

const UID = '@system-app'
const allDay = (day: string): DateArray => {
  const d = parseISO(day)
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
}
const at = (day: string, time: string): DateArray => {
  const [h, m] = time.split(':').map(Number)
  return [...allDay(day), h, m] as DateArray
}
const dayBefore = { before: true, hours: 15 }
const weekdayOf = (day: string): Weekday => WEEKDAYS[(parseISO(day).getDay() + 6) % 7]

function firstMatching(today: string, days: Weekday[]) {
  for (let i = 0; i < 7; i++) {
    const d = format(addDays(parseISO(today), i), 'yyyy-MM-dd')
    if (days.includes(weekdayOf(d))) return d
  }
  return today
}

const local = { startInputType: 'local', startOutputType: 'local', endInputType: 'local', endOutputType: 'local' } as const

export function buildEvents(prefs: CalendarPrefs, data: CalendarData, today: string): EventAttributes[] {
  const has = (p: CalPart) => prefs.parts.includes(p)
  const subject = (id?: number) => data.subjects.find((s) => s.id === id)?.name ?? 'Uni'
  const out: EventAttributes[] = []
  const whole = (uid: string, title: string, day: string, alarm: boolean) =>
    out.push({
      ...local,
      uid: uid + UID,
      title,
      start: allDay(day),
      end: allDay(format(addDays(parseISO(day), 1), 'yyyy-MM-dd')),
      ...(alarm ? { alarms: [{ action: 'display', description: title, trigger: dayBefore }] } : {}),
    })

  if (has('Training') && prefs.trainingDays.length) {
    const order = WEEKDAYS.filter((d) => prefs.trainingDays.includes(d))
    out.push({
      ...local,
      uid: 'training' + UID,
      title: 'Training',
      start: at(firstMatching(today, order), prefs.trainingTime),
      duration: { minutes: prefs.trainingMinutes },
      recurrenceRule: `FREQ=WEEKLY;BYDAY=${order.map((d) => BYDAY[d]).join(',')}`,
      alarms: [{ action: 'display', description: 'Training', trigger: { before: true, minutes: 30 } }],
    })
  }
  if (has('Pflegeroutine'))
    for (const r of data.routines) {
      const title = r === 'morning' ? 'Pflegeroutine morgens' : 'Pflegeroutine abends'
      out.push({
        ...local,
        uid: `skin-${r}` + UID,
        title,
        start: at(today, r === 'morning' ? prefs.morningTime : prefs.eveningTime),
        duration: { minutes: 10 },
        recurrenceRule: 'FREQ=DAILY',
        alarms: [{ action: 'display', description: title, trigger: { before: true, minutes: 0 } }],
      })
    }
  if (has('Lernplan'))
    for (const p of data.plans)
      for (const t of p.tasks)
        if (!t.done && t.day >= today) whole(`task-${p.id}-${t.id}`, `Lernen ${subject(p.subjectId)}: ${t.title}`, t.day, false)
  if (has('Klausuren'))
    for (const e of data.exams) if (e.deadline >= today) whole(`exam-${e.id}`, `Klausur ${subject(e.subjectId)}`, e.deadline, true)
  if (has('Fristen'))
    for (const t of data.todos)
      if (!t.done && t.due && t.due >= today) whole(`todo-${t.id}`, `Frist ${subject(t.subjectId)}: ${t.text}`, t.due, true)
  return out
}

export function calendarFile(events: EventAttributes[]) {
  const { error, value } = createEvents(events, { productId: 'system-app', calName: 'System' })
  if (error || !value) throw error ?? new Error('Kalenderdatei konnte nicht erstellt werden.')
  return value
}
