import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { Button, SystemWindow } from './ui'
import { useSetting } from '../db/settings'
import { currentDay } from '../lib/events'
import { exportBackup } from '../lib/backup'
import { useSyncStatus } from '../lib/sync'
import { reviewWeek } from '../lib/stats'

const BACKUP_DAYS = 7

export function TodayHints() {
  return (
    <>
      <ReviewHint />
      <BackupHint />
    </>
  )
}

function ReviewHint() {
  const navigate = useNavigate()
  const day = useLiveQuery(() => currentDay())
  const seen = useSetting('reviewSeenWeek')
  if (!day || parseISO(day).getDay() !== 0 || seen === reviewWeek(day).start) return null
  return (
    <SystemWindow title="Wochenrückblick">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">Deine Woche ist ausgewertet.</span>
        <Button onClick={() => navigate('/auswertung')}>Ansehen</Button>
      </div>
    </SystemWindow>
  )
}

function BackupHint() {
  const { connected } = useSyncStatus()
  const last = useSetting('lastBackupAt')
  const [message, setMessage] = useState('')
  const [now] = useState(() => Date.now())
  if (connected || now - last < BACKUP_DAYS * 86400000) return null
  const save = async () => {
    try {
      await exportBackup()
    } catch (e) {
      setMessage(`Fehler: ${(e as Error).message}`)
    }
  }
  return (
    <SystemWindow title="Backup">
      <p className="mb-3 text-sm">
        Letztes Backup: {last ? formatDistanceToNow(last, { addSuffix: true, locale: de }) : 'noch nie'}. Ohne Dropbox-Sync liegen deine
        Daten nur auf diesem Gerät.
      </p>
      <Button className="w-full" onClick={save}>
        Jetzt sichern
      </Button>
      {message && <p className="mt-2 text-xs text-sys-danger">{message}</p>}
    </SystemWindow>
  )
}
