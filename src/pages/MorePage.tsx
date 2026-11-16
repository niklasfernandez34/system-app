import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button, Dialog, NumberInput, SystemWindow } from '../components/ui'
import { setSetting, useSetting } from '../db/settings'
import { PinSettings } from '../components/PinSettings'
import { exportBackup, importBackup } from '../lib/backup'
import { SyncSettings } from '../components/SyncSettings'

type Pending = { file: File } | null

const AREAS = [
  ['/status', 'Status', 'var(--color-sys-xp)'],
  ['/auswertung', 'Auswertung', 'var(--color-sys-xp)'],
  ['/kalender', 'Kalender', 'var(--color-sys-xp)'],
  ['/tagebuch', 'Tagebuch', 'var(--color-sys-will)'],
  ['/habits', 'Habits', 'var(--color-sys-will)'],
  ['/notizen', 'Notizen', 'var(--color-sys-will)'],
  ['/haut', 'Hautbild', 'var(--color-sys-skin)'],
] as const

export function MorePage() {
  const navigate = useNavigate()
  const dayStartHour = useSetting('dayStartHour')
  const lastBackupAt = useSetting('lastBackupAt')
  const [pending, setPending] = useState<Pending>(null)
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const run = async (fn: () => Promise<string>) => {
    try {
      setMessage(await fn())
    } catch (e) {
      setMessage(`Fehler: ${(e as Error).message}`)
    }
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setPending({ file })
  }

  const confirmImport = async () => {
    if (!pending) return
    const p = pending
    setPending(null)
    await run(async () => (await importBackup(p.file), 'Backup geladen.'))
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Bereiche" className="[&>.card]:p-0">
        <ul className="divide-y divide-sys-line">
          {AREAS.map(([to, label, color]) => (
            <li key={to}>
              <button
                type="button"
                onClick={() => navigate(to)}
                className="flex min-h-13 w-full items-center gap-3 px-4 text-left font-semibold active:bg-sys-raised"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                <span className="flex-1">{label}</span>
                <span className="text-lg text-sys-muted">›</span>
              </button>
            </li>
          ))}
        </ul>
      </SystemWindow>

      <SystemWindow title="Einstellungen">
        <NumberInput
          label="Tageswechsel (Uhrzeit)"
          unit="Uhr"
          value={dayStartHour}
          min={0}
          max={12}
          onChange={(v) => setSetting('dayStartHour', Math.round(v))}
        />
        <p className="mt-2 text-xs text-sys-muted">
          Alles vor dieser Uhrzeit zählt noch zum Vortag.
        </p>
      </SystemWindow>

      <PinSettings />

      <SyncSettings />

      <SystemWindow title="Backup">
        <p className="mb-3 text-sm text-sys-muted">
          Letztes Backup:{' '}
          {lastBackupAt ? formatDistanceToNow(lastBackupAt, { addSuffix: true, locale: de }) : 'noch nie'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => run(async () => (await exportBackup(), 'Backup erstellt.'))}>Backup sichern</Button>
          <Button variant="ghost" onClick={() => input.current?.click()}>
            Backup laden
          </Button>
        </div>
        <p className="mt-2 text-xs text-sys-muted">Eine Datei mit allem: Daten, Fotos, Dateien und Handschrift. Name enthält Datum und Uhrzeit.</p>
        <input ref={input} type="file" accept="application/zip,.zip,application/json,.json" className="hidden" onChange={pick} />
        {message && <p className="mt-3 text-center text-sm text-sys-glow">{message}</p>}
      </SystemWindow>

      <Dialog open={!!pending} onClose={() => setPending(null)} title="Warnung">
        <p className="mb-4 text-center">
          Alle aktuellen Daten, Fotos und Dateien werden durch „{pending?.file.name}“ ersetzt. Fortfahren?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setPending(null)}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={confirmImport}>
            Ersetzen
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
