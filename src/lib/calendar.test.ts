import { describe, expect, it } from 'vitest'
import { DEFAULT_CALENDAR } from '../config/calendar'
import { buildEvents, calendarFile, type CalendarData } from './calendar'

const data: CalendarData = {
  subjects: [{ id: 1, name: 'Mathe' }],
  plans: [
    {
      id: 3,
      subjectId: 1,
      tasks: [
        { id: 'a', day: '2026-11-15', title: 'Alt' },
        { id: 'b', day: '2026-11-18', title: 'Integrale' },
        { id: 'c', day: '2026-11-19', title: 'Fertig', done: true },
      ],
    },
  ],
  exams: [{ id: 7, subjectId: 1, deadline: '2026-12-01' }],
  todos: [
    { id: 9, subjectId: 1, text: 'Blatt 4', due: '2026-11-20', done: false },
    { id: 10, subjectId: 1, text: 'Ohne Frist', done: false },
  ],
  routines: ['morning', 'evening'],
}

const prefs = { ...DEFAULT_CALENDAR, parts: [...DEFAULT_CALENDAR.parts, 'Pflegeroutine' as const] }

describe('buildEvents', () => {
  const events = buildEvents(prefs, data, '2026-11-17')
  const byUid = (uid: string) => events.find((e) => e.uid === `${uid}@system-app`)

  it('legt das Training wöchentlich ab dem nächsten passenden Tag an', () => {
    expect(byUid('training')).toMatchObject({ start: [2026, 11, 18, 18, 0], recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' })
  })
  it('nimmt nur offene, kommende Lernplan-Aufgaben', () => {
    expect(byUid('task-3-a')).toBeUndefined()
    expect(byUid('task-3-c')).toBeUndefined()
    expect(byUid('task-3-b')).toMatchObject({ title: 'Lernen Mathe: Integrale', start: [2026, 11, 18], end: [2026, 11, 19] })
  })
  it('legt Klausuren und Fristen ganztägig mit Erinnerung am Vortag an', () => {
    expect(byUid('exam-7')).toMatchObject({ title: 'Klausur Mathe', start: [2026, 12, 1] })
    expect(byUid('exam-7')?.alarms).toHaveLength(1)
    expect(byUid('todo-9')).toMatchObject({ title: 'Frist Mathe: Blatt 4' })
    expect(byUid('todo-10')).toBeUndefined()
  })
  it('legt Pflegeroutinen täglich an', () => {
    expect(byUid('skin-morning')).toMatchObject({ start: [2026, 11, 17, 7, 30], recurrenceRule: 'FREQ=DAILY' })
  })
  it('lässt abgewählte Teile weg', () => {
    expect(buildEvents({ ...prefs, parts: ['Klausuren'] }, data, '2026-11-17')).toHaveLength(1)
  })
})

describe('calendarFile', () => {
  it('erzeugt eine gültige ICS-Datei', () => {
    const ics = calendarFile(buildEvents(prefs, data, '2026-11-17'))
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261201')
    expect(ics).toContain('BEGIN:VALARM')
  })
})
