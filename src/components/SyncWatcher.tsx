import { useEffect } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button, Dialog } from './ui'
import { syncNow, useSyncStatus } from '../lib/sync'

const INTERVAL = 5 * 60 * 1000

export function SyncWatcher() {
  const s = useSyncStatus()

  useEffect(() => {
    if (!s.connected) return
    const t = setInterval(() => document.visibilityState === 'visible' && syncNow(), INTERVAL)
    const onHide = () => document.visibilityState === 'hidden' && syncNow()
    const onOnline = () => syncNow()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('online', onOnline)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('online', onOnline)
    }
  }, [s.connected])

  return (
    <Dialog open={!!s.conflict} onClose={() => undefined} title="Sync-Konflikt">
      {s.conflict && (
        <div className="space-y-3">
          <p className="text-center text-sm">
            Auf diesem Gerät und in der Dropbox (Stand vom{' '}
            {format(new Date(s.conflict.remoteModified), "d. MMM, HH:mm 'Uhr'", { locale: de })}) gibt es Änderungen. Welcher Stand soll
            gelten?
          </p>
          <Button className="w-full" onClick={() => syncNow({ resolve: 'remote' })}>
            Dropbox-Stand laden
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => syncNow({ resolve: 'local' })}>
            Diesen Stand behalten und hochladen
          </Button>
          <p className="text-center text-xs text-sys-muted">Der andere Stand wird überschrieben. Im Zweifel vorher unter Mehr → Backup sichern.</p>
        </div>
      )}
    </Dialog>
  )
}
