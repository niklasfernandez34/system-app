import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button, Dialog, NumberInput, SystemWindow } from '../components/ui'
import { setSetting, useSetting } from '../db/settings'
import { PinSettings } from '../components/PinSettings'
import { exportData, exportPhotos, importData, importPhotos } from '../lib/backup'

type Pending = { kind: 'data' | 'photos'; file: File } | null

export function MorePage() {
  const navigate = useNavigate()
  const dayStartHour = useSetting('dayStartHour')
  const lastBackupAt = useSetting('lastBackupAt')
  const [pending, setPending] = useState<Pending>(null)
  const [message, setMessage] = useState('')
  const dataInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  const run = async (fn: () => Promise<string>) => {
    try {
      setMessage(await fn())
    } catch (e) {
      setMessage(`Fehler: ${(e as Error).message}`)
    }
  }

  const pick = (kind: 'data' | 'photos') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setPending({ kind, file })
  }

  const confirmImport = async () => {
    if (!pending) return
    const p = pending
    setPending(null)
    await run(async () =>
      p.kind === 'data'
        ? (await importData(p.file), 'Daten wiederhergestellt.')
        : `${await importPhotos(p.file)} Fotos wiederhergestellt.`,
    )
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Bereiche">
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => navigate('/tagebuch')}>Tagebuch</Button>
          <Button onClick={() => navigate('/habits')}>Habits</Button>
          <Button onClick={() => navigate('/notizen')}>Notizen</Button>
        </div>
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

      <SystemWindow title="Backup">
        <p className="mb-3 text-sm text-sys-muted">
          Letztes Backup:{' '}
          {lastBackupAt ? formatDistanceToNow(lastBackupAt, { addSuffix: true, locale: de }) : 'noch nie'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => run(async () => (await exportData(), 'Daten exportiert.'))}>
            Daten sichern
          </Button>
          <Button onClick={() => run(async () => `${await exportPhotos()} Fotos exportiert.`)}>
            Fotos sichern
          </Button>
          <Button variant="ghost" onClick={() => dataInput.current?.click()}>
            Daten laden
          </Button>
          <Button variant="ghost" onClick={() => photoInput.current?.click()}>
            Fotos laden
          </Button>
        </div>
        <input ref={dataInput} type="file" accept="application/json,.json" className="hidden" onChange={pick('data')} />
        <input ref={photoInput} type="file" accept="application/zip,.zip" className="hidden" onChange={pick('photos')} />
        {message && <p className="mt-3 text-center text-sm text-sys-glow">{message}</p>}
      </SystemWindow>

      <Dialog open={!!pending} onClose={() => setPending(null)} title="Warnung">
        <p className="mb-4 text-center">
          {pending?.kind === 'data' ? 'Alle aktuellen Daten' : 'Alle aktuellen Fotos'} werden durch das Backup
          ersetzt. Fortfahren?
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
