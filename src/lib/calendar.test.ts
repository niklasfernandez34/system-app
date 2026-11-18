import { describe, expect, it } from 'vitest'
import { DEFAULT_CALENDAR } from '../config/calendar'
import { buildEvents, calendarFile, type CalendarData } from './calendar'

const data: CalendarData = {
  routines: ['morning', 'evening'],
}

const prefs = DEFAULT_CALENDAR

describe('buildEvents', () => {
  const events = buildEvents(prefs, data, '2026-11-17')
  const byUid = (uid: string) => events.find((e) => e.uid === `${uid}@system-app`)

  it('legt das Training wöchentlich ab dem nächsten passenden Tag an', () => {
    expect(byUid('training')).toMatchObject({ start: [2026, 11, 18, 18, 0], recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' })
  })
  it('legt Pflegeroutinen täglich an', () => {
    expect(byUid('skin-morning')).toMatchObject({ start: [2026, 11, 17, 7, 30], recurrenceRule: 'FREQ=DAILY' })
  })
  it('lässt abgewählte Teile weg', () => {
    expect(buildEvents({ ...prefs, parts: ['Pflegeroutine'] }, data, '2026-11-17')).toHaveLength(2)
  })
})

describe('calendarFile', () => {
  it('erzeugt eine gültige ICS-Datei', () => {
    const ics = calendarFile(buildEvents(prefs, data, '2026-11-17'))
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(ics).toContain('BEGIN:VALARM')
  })
})
