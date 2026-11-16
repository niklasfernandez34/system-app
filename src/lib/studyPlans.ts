import { useLiveQuery } from 'dexie-react-hooks'
import { db, type StudyPlanRecord } from '../db/db'
import { currentDay, logEvent } from './events'
import { buildPlan } from './studyPlan'

export function usePlan(subjectId: number) {
  return useLiveQuery(async () => (await db.studyPlans.where('subjectId').equals(subjectId).first()) ?? null, [subjectId])
}

export async function savePlan(subjectId: number, data: { examDay: string; topics: string[]; repeatDays: number }) {
  const today = await currentDay()
  const existing = await db.studyPlans.where('subjectId').equals(subjectId).first()
  const done = existing?.tasks.filter((t) => t.done) ?? []
  const tasks = buildPlan(data.topics, today, data.examDay, data.repeatDays, done)
  if (existing) await db.studyPlans.update(existing.id, { ...data, tasks })
  else await db.studyPlans.add({ ...data, subjectId, tasks, createdAt: Date.now() })
}

export async function deletePlan(id: number) {
  for (const e of await db.events.where('type').equals('plan_task_done').filter((e) => e.data?.planId === id).toArray())
    await db.events.delete(e.id)
  await db.studyPlans.delete(id)
}

export async function togglePlanTask(planId: number, taskId: string) {
  const plan = await db.studyPlans.get(planId)
  const task = plan?.tasks.find((t) => t.id === taskId)
  if (!plan || !task) return
  const done = !task.done
  await db.studyPlans.update(planId, { tasks: plan.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)) })
  if (done) await logEvent('plan_task_done', { planId, taskId, subjectId: plan.subjectId })
  else {
    const e = await db.events.where('type').equals('plan_task_done').filter((e) => e.data?.taskId === taskId).first()
    if (e) await db.events.delete(e.id)
  }
}

export type TodayTask = StudyPlanRecord['tasks'][number] & { planId: number; subject: string; late: boolean }

export function useTodayPlanTasks() {
  return useLiveQuery(async () => {
    const today = await currentDay()
    const names = new Map((await db.subjects.toArray()).map((s) => [s.id, s]))
    const out: TodayTask[] = []
    for (const p of await db.studyPlans.toArray()) {
      const s = names.get(p.subjectId)
      if (!s || s.archived || p.examDay < today) continue
      for (const t of p.tasks)
        if (t.day === today || (t.day < today && !t.done && !t.repeat))
          out.push({ ...t, planId: p.id, subject: s.name, late: t.day < today })
    }
    return out.sort((a, b) => a.day.localeCompare(b.day))
  })
}
