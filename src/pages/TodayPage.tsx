import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { Button, SystemWindow } from '../components/ui'
import { HabitChecklist } from '../components/HabitChecklist'
import { currentDay } from '../lib/events'
import { useTodayCheckin } from '../lib/journal'

export function TodayPage() {
  const day = useLiveQuery(() => currentDay())
  const checkin = useTodayCheckin()
  const navigate = useNavigate()

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
      <SystemWindow title="Check-in">
        {checkin !== undefined && (
          <div className="flex items-center justify-between gap-3">
            <span className={checkin ? 'text-sys-glow' : 'text-sys-muted'}>
              {checkin ? '✓ Erledigt' : 'Noch offen'}
            </span>
            <Button variant={checkin ? 'ghost' : 'primary'} onClick={() => navigate('/tagebuch')}>
              {checkin ? 'Öffnen' : 'Check-in starten'}
            </Button>
          </div>
        )}
      </SystemWindow>
      <SystemWindow title="Habits">
        <HabitChecklist />
        <Button variant="ghost" className="mt-3 w-full" onClick={() => navigate('/habits')}>
          Habits verwalten
        </Button>
      </SystemWindow>
    </div>
  )
}
