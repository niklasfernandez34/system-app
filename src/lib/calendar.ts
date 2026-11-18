import { addDays, format, parseISO } from 'date-fns'
import { createEvents, type DateArray, type EventAttributes } from 'ics'
import { WEEKDAYS, type CalPart, type CalendarPrefs, type Weekday } from '../config/calendar'

const BYDAY: Record<Weekday, string> = { Mo: 'MO', Di: 'TU', Mi: 'WE', Do: 'TH', Fr: 'FR', Sa: 'SA', So: 'SU' }

export type CalendarData = {
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
  const out: EventAttributes[] = []
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
  return out
}

export function calendarFile(events: EventAttributes[]) {
  const { error, value } = createEvents(events, { productId: 'system-app', calName: 'System' })
  if (error || !value) throw error ?? new Error('Kalenderdatei konnte nicht erstellt werden.')
  return value
}
