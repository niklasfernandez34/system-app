import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Chips, MultiChips, SystemWindow, TimeInput } from '../components/ui'
import { db } from '../db/db'
import { setSetting, useSetting } from '../db/settings'
import { CAL_PARTS, WEEKDAYS, type CalendarPrefs } from '../config/calendar'
import { buildEvents, calendarFile, type CalendarData } from '../lib/calendar'
import { currentDay } from '../lib/events'
import { saveFile } from '../lib/backup'

const DURATIONS = ['45', '60', '90', '120'] as const

function useCalendarData() {
  return useLiveQuery(async () => {
    const [today, steps] = await Promise.all([currentDay(), db.skinSteps.toArray()])
    const active = steps.filter((s) => !s.archived)
    const data: CalendarData = {
      routines: (['morning', 'evening'] as const).filter((r) => active.some((s) => s.routine === r)),
    }
    return { today, data }
  })
}

export function CalendarPage() {
  const prefs = useSetting('calendar')
  const loaded = useCalendarData()
  const [message, setMessage] = useState('')
  if (!loaded) return null
  const set = (patch: Partial<CalendarPrefs>) => setSetting('calendar', { ...prefs, ...patch })
  const events = buildEvents(prefs, loaded.data, loaded.today)
  const count = (prefix: string) => events.filter((e) => e.uid?.startsWith(prefix)).length
  const has = (p: (typeof CAL_PARTS)[number]) => prefs.parts.includes(p)

  const exportFile = async () => {
    try {
      const blob = new Blob([calendarFile(events)], { type: 'text/calendar' })
      await saveFile(blob, 'System-Kalender.ics')
      setMessage('')
    } catch (e) {
      setMessage(`Fehler: ${(e as Error).message}`)
    }
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Kalenderexport">
        <div className="space-y-4">
          <MultiChips options={CAL_PARTS} value={prefs.parts.filter((p) => CAL_PARTS.includes(p))} onChange={(parts) => set({ parts })} label="Was soll in den Kalender?" />
          {has('Training') && (
            <div className="space-y-3 rounded-xl border border-sys-line p-3">
              <MultiChips options={WEEKDAYS} value={prefs.trainingDays} onChange={(trainingDays) => set({ trainingDays })} label="Trainingstage" />
              <TimeInput label="Uhrzeit" value={prefs.trainingTime} onChange={(trainingTime) => set({ trainingTime })} />
              <Chips
                label="Dauer (Min.)"
                options={DURATIONS}
                value={String(prefs.trainingMinutes) as (typeof DURATIONS)[number]}
                onChange={(d) => set({ trainingMinutes: Number(d) })}
              />
            </div>
          )}
          {has('Pflegeroutine') && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-sys-line p-3">
              <TimeInput label="Morgens" value={prefs.morningTime} onChange={(morningTime) => set({ morningTime })} />
              <TimeInput label="Abends" value={prefs.eveningTime} onChange={(eveningTime) => set({ eveningTime })} />
              {loaded.data.routines.length === 0 && (
                <p className="col-span-2 text-xs text-sys-muted">Lege zuerst unter Hautbild Pflegeschritte an.</p>
              )}
            </div>
          )}
        </div>
      </SystemWindow>

      <SystemWindow title="Vorschau">
        <ul className="space-y-1 text-sm">
          {has('Training') && <Row label="Training" value={prefs.trainingDays.length ? `${prefs.trainingDays.join(', ')} um ${prefs.trainingTime}` : 'keine Tage gewählt'} />}
          {has('Pflegeroutine') && <Row label="Pflegeroutine" value={count('skin-') ? 'täglich' : 'keine Schritte'} />}
        </ul>
        <p className="mt-3 text-xs text-sys-muted">
          Training und Pflege wiederholen sich, Erinnerung 30 Min. vorher bzw. zur Uhrzeit.
        </p>
        <Button className="mt-3 w-full" disabled={events.length === 0} onClick={exportFile}>
          Kalenderdatei erstellen
        </Button>
        {message && <p className="mt-2 text-xs text-sys-danger">{message}</p>}
      </SystemWindow>

      <SystemWindow title="So kommt es in den Kalender">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>„Kalenderdatei erstellen“ → „In Dateien sichern“.</li>
          <li>In der Dateien-App die Datei antippen → „Alle hinzufügen“ und einen Kalender wählen.</li>
          <li>
            Tipp: Lege in der Kalender-App einen eigenen Kalender „System“ an. Vor einem neuen Export löschst du ihn und legst ihn neu an, sonst gibt
            es Termine doppelt.
          </li>
        </ol>
      </SystemWindow>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="text-sys-muted">{value}</span>
    </li>
  )
}
