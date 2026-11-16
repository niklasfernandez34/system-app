import { useNavigate } from 'react-router'
import { SystemWindow } from './ui'
import { PlanTaskRow } from './StudyPlan'
import { togglePlanTask, useTodayPlanTasks } from '../lib/studyPlans'

export function TodayPlan() {
  const tasks = useTodayPlanTasks()
  const navigate = useNavigate()
  if (!tasks?.length) return null
  return (
    <SystemWindow title="Lernplan heute">
      {tasks.map((t) => (
        <PlanTaskRow key={t.id} task={t} late={t.late} sub={t.subject} onToggle={() => togglePlanTask(t.planId, t.id)} />
      ))}
      <button type="button" className="mt-2 w-full text-xs text-sys-muted underline" onClick={() => navigate('/uni')}>
        Zur Uni
      </button>
    </SystemWindow>
  )
}
