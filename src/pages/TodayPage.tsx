import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { Button, SystemWindow } from '../components/ui'
import { HabitChecklist } from '../components/HabitChecklist'
import { LevelPanel } from '../components/LevelPanel'
import { BossList } from '../components/BossList'
import { QuestList } from '../components/QuestList'
import { Deadlines } from '../components/Deadlines'
import { TodayPlan } from '../components/TodayPlan'
import { SkinRoutines } from '../components/SkinRoutines'
import { currentDay } from '../lib/events'
import { useTodayCheckin } from '../lib/journal'
import { useRunningWorkout, useTrainedToday } from '../lib/sport'
import { NutritionSummary } from '../components/NutritionSummary'
import { useDayNutrition } from '../lib/nutrition'

export function TodayPage() {
  const day = useLiveQuery(() => currentDay())
  const checkin = useTodayCheckin()
  const navigate = useNavigate()
  const trained = useTrainedToday()
  const running = useRunningWorkout()

  return (
    <div className="space-y-4">
      <SystemWindow title="System">
        <p className="mb-3 text-center text-sys-muted">
          {day ? format(parseISO(day), 'EEEE, d. MMMM', { locale: de }) : '…'}
        </p>
        <LevelPanel />
      </SystemWindow>
      <SystemWindow title="Tägliche Quests">
        <QuestList />
      </SystemWindow>
      <BossList compact />
      <Deadlines compact />
      <TodayPlan />
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
      <SystemWindow title="Training">
        {trained !== undefined && (
          <div className="flex items-center justify-between gap-3">
            <span className={trained ? 'text-sys-glow' : 'text-sys-muted'}>
              {trained ? '✓ Trainiert' : running ? 'Läuft gerade' : 'Noch kein Training'}
            </span>
            <Button
              variant={trained && !running ? 'ghost' : 'primary'}
              onClick={() => navigate(running ? '/sport/training' : '/sport')}
            >
              {running ? 'Fortsetzen' : trained ? 'Öffnen' : 'Zum Training'}
            </Button>
          </div>
        )}
      </SystemWindow>
      <TodayNutrition />
      <SkinRoutines compact />
      <SystemWindow title="Habits">
        <HabitChecklist />
        <Button variant="ghost" className="mt-3 w-full" onClick={() => navigate('/habits')}>
          Habits verwalten
        </Button>
      </SystemWindow>
    </div>
  )
}

function TodayNutrition() {
  const data = useDayNutrition()
  const navigate = useNavigate()
  if (!data) return null
  return (
    <SystemWindow title="Ernährung">
      <NutritionSummary totals={data.totals} goals={data.goals} compact />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm text-sys-muted">
          Wasser {data.water.toLocaleString('de-DE')} / {data.goals.water.toLocaleString('de-DE')} ml
        </span>
        <Button variant="ghost" onClick={() => navigate('/ernaehrung')}>
          Öffnen
        </Button>
      </div>
    </SystemWindow>
  )
}
