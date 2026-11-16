import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { PlanTask } from '../db/db'

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

export function buildPlan(topics: string[], fromDay: string, examDay: string, repeatDays: number, done: PlanTask[] = []): PlanTask[] {
  const total = differenceInCalendarDays(parseISO(examDay), parseISO(fromDay))
  if (total <= 0) return done
  const repeat = Math.min(repeatDays, Math.max(0, total - 1))
  const learnDays = total - repeat
  const doneTitles = new Set(done.filter((t) => !t.repeat).map((t) => t.title))
  const open = topics.filter((t) => !doneTitles.has(t))
  const tasks: PlanTask[] = [...done]
  open.forEach((title, i) => {
    const offset = Math.floor((i * learnDays) / open.length)
    const day = iso(addDays(parseISO(fromDay), offset))
    tasks.push({ id: crypto.randomUUID(), day, title })
  })
  for (let r = 0; r < repeat; r++) {
    const day = iso(addDays(parseISO(fromDay), learnDays + r))
    tasks.push({ id: crypto.randomUUID(), day, title: 'Wiederholen: alle Themen', repeat: true })
  }
  return tasks.sort((a, b) => a.day.localeCompare(b.day))
}
