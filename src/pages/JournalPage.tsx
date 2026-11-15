import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, NumberInput, Rating, SystemWindow, TextField } from '../components/ui'
import { PinGate } from '../components/PinGate'
import { db } from '../db/db'
import { EMPTY_CHECKIN, saveCheckin, useTodayCheckin, type Checkin } from '../lib/journal'
import { currentDay } from '../lib/events'

function CheckinForm({ initial, isNew }: { initial: Checkin; isNew: boolean }) {
  const [entry, setEntry] = useState(initial)
  const [saved, setSaved] = useState(false)
  const set = <K extends keyof Checkin>(key: K) => (value: Checkin[K]) => {
    setSaved(false)
    setEntry((e) => ({ ...e, [key]: value }))
  }

  return (
    <SystemWindow title="Check-in">
      <div className="space-y-4">
        <NumberInput label="Schlaf" unit="h" step={0.5} min={0} max={16} value={entry.sleepHours} onChange={set('sleepHours')} />
        <Rating label="Schlafqualität" value={entry.sleep} onChange={set('sleep')} />
        <Rating label="Energie" value={entry.energy} onChange={set('energy')} />
        <Rating label="Stimmung" value={entry.mood} onChange={set('mood')} />
        <TextField label="Tagebuch" multiline rows={5} placeholder="Wie war dein Tag?" value={entry.text} onChange={set('text')} />
        <Button
          className="w-full"
          onClick={async () => {
            await saveCheckin(entry)
            setSaved(true)
          }}
        >
          {isNew ? 'Check-in abschließen' : 'Speichern'}
        </Button>
        {saved && <p className="text-center text-sm text-sys-glow">Gespeichert.</p>}
      </div>
    </SystemWindow>
  )
}

function History() {
  const entries = useLiveQuery(async () => {
    const today = await currentDay()
    return db.journal.where('day').below(today).reverse().limit(60).toArray()
  })
  if (!entries?.length) return null

  return (
    <SystemWindow title="Verlauf">
      <ul className="divide-y divide-sys-line">
        {entries.map((e) => (
          <li key={e.day} className="py-3">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{format(parseISO(e.day), 'EEE, d. MMM yyyy', { locale: de })}</span>
              <span className="text-sys-muted">
                {e.sleepHours} h · S {e.sleep} · E {e.energy} · M {e.mood}
              </span>
            </div>
            {e.text && <p className="mt-1 whitespace-pre-wrap text-sm text-sys-muted">{e.text}</p>}
          </li>
        ))}
      </ul>
    </SystemWindow>
  )
}

export function JournalPage() {
  const today = useTodayCheckin()

  return (
    <PinGate>
      <div className="space-y-4">
        {today !== undefined && <CheckinForm initial={today ?? EMPTY_CHECKIN} isNew={!today} />}
        <History />
      </div>
    </PinGate>
  )
}
