import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button, ProgressBar, SystemWindow, TextField } from './ui'
import { finishAuth, startAuth } from '../lib/dropbox'
import { connect, disconnect, pendingAuth, rememberAuthStart, syncNow, usage, useSyncStatus } from '../lib/sync'

const gb = (b: number) => `${(b / 1024 ** 3).toFixed(2).replace('.', ',')} GB`

export function SyncSettings() {
  const s = useSyncStatus()
  const [appKey, setAppKey] = useState(() => pendingAuth().appKey ?? '')
  const [code, setCode] = useState('')
  const [started, setStarted] = useState(() => !!pendingAuth().verifier)
  const [error, setError] = useState('')
  const [space, setSpace] = useState<{ used: number; allocated: number } | null>(null)
  const [, setNow] = useState(0)

  useEffect(() => {
    if (!s.connected) return
    usage().then(setSpace, () => setSpace(null))
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [s.connected, s.lastSyncedAt])

  const login = async () => {
    setError('')
    const { verifier, url } = await startAuth(appKey.trim())
    rememberAuthStart(appKey.trim(), verifier)
    setStarted(true)
    window.open(url, '_blank')
  }

  const finish = async () => {
    setError('')
    const p = pendingAuth()
    if (!p.verifier || !p.appKey) return setError('Bitte zuerst „Bei Dropbox anmelden“ tippen.')
    try {
      connect(await finishAuth(p.appKey, code, p.verifier))
      setCode('')
      setStarted(false)
      syncNow()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!s.connected)
    return (
      <SystemWindow title="Dropbox-Sync">
        <p className="mb-3 text-sm text-sys-muted">
          Hält iPhone und iPad automatisch gleich: beim Öffnen wird der neueste Stand geladen, alle 5 Minuten gesichert. Die Daten liegen in deinem
          eigenen Dropbox-Konto.
        </p>
        <details className="mb-3 text-sm">
          <summary className="cursor-pointer text-sys-glow">Einmalige Einrichtung (ca. 5 Min.)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sys-muted">
            <li>Auf dropbox.com/developers/apps anmelden und „Create app“ wählen.</li>
            <li>„Scoped access“ und „App folder“ wählen, einen Namen eingeben (z. B. „System-Sync-Niklas“), erstellen.</li>
            <li>Im Reiter „Permissions“ files.content.write und files.content.read anhaken, unten „Submit“.</li>
            <li>Im Reiter „Settings“ den „App key“ kopieren und hier einfügen.</li>
          </ol>
        </details>
        <div className="space-y-3">
          <TextField label="App key" value={appKey} onChange={setAppKey} placeholder="z. B. a1b2c3d4e5f6g7h" />
          <Button className="w-full" disabled={!appKey.trim()} onClick={login}>
            Bei Dropbox anmelden
          </Button>
          {started && (
            <>
              <p className="text-xs text-sys-muted">Nach „Zulassen“ zeigt Dropbox einen Code. Kopieren, hierher zurückkehren und einfügen:</p>
              <TextField label="Code von Dropbox" value={code} onChange={setCode} />
              <Button className="w-full" disabled={!code.trim()} onClick={finish}>
                Verbinden
              </Button>
            </>
          )}
          {error && <p className="text-center text-sm text-sys-danger">{error}</p>}
        </div>
      </SystemWindow>
    )

  return (
    <SystemWindow title="Dropbox-Sync">
      <p className="text-center text-sm">
        {s.busy ? (
          <span className="animate-pulse text-sys-glow">Synchronisiere …</span>
        ) : s.lastSyncedAt ? (
          <span className="text-sys-glow">✓ Zuletzt {formatDistanceToNow(s.lastSyncedAt, { addSuffix: true, locale: de })}</span>
        ) : (
          <span className="text-sys-muted">Noch nicht synchronisiert</span>
        )}
      </p>
      {s.error && <p className="mt-1 text-center text-sm text-sys-danger">{s.error}</p>}
      {space && space.allocated > 0 && (
        <div className="mt-3">
          <ProgressBar value={Math.round(space.used / 1024 ** 2)} max={Math.round(space.allocated / 1024 ** 2)} label="Dropbox belegt (MB)" />
          <p className="mt-1 text-center text-xs text-sys-muted">
            {gb(space.used)} von {gb(space.allocated)}
          </p>
        </div>
      )}
      <p className="mt-2 text-center text-xs text-sys-muted">Automatisch beim Öffnen, alle 5 Minuten und beim Verlassen der App.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={disconnect}>
          Trennen
        </Button>
        <Button disabled={s.busy} onClick={() => syncNow()}>
          Jetzt synchronisieren
        </Button>
      </div>
    </SystemWindow>
  )
}
