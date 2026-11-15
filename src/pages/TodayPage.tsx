import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { SystemWindow } from '../components/ui'
import { currentDay } from '../lib/events'

export function TodayPage() {
  const day = useLiveQuery(() => currentDay())

  return (
    <div className="space-y-4">
      <SystemWindow title="System">
        <p className="text-center text-lg">
          {day ? format(parseISO(day), 'EEEE, d. MMMM', { locale: de }) : '…'}
        </p>
      </SystemWindow>
      <SystemWindow title="Tägliche Quests">
        <p className="text-center text-sys-muted">Noch keine Quests vorhanden.</p>
      </SystemWindow>
    </div>
  )
}
