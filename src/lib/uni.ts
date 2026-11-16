import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getSetting, setSetting } from '../db/settings'
import { currentDay, logEvent } from './events'

export async function addSubject(name: string) {
  const last = await db.subjects.orderBy('order').last()
  return db.subjects.add({ name, order: (last?.order ?? 0) + 1, createdAt: Date.now() })
}

export function updateSubject(id: number, changes: { name?: string; archived?: boolean }) {
  return db.subjects.update(id, changes)
}

export function addTodo(subjectId: number, text: string, due?: string) {
  return db.todos.add({ subjectId, text, due, done: false, createdAt: Date.now() })
}

export function updateTodo(id: number, changes: { text?: string; due?: string }) {
  return db.todos.update(id, changes)
}

async function todoEvent(todoId: number) {
  return db.events
    .where('type')
    .equals('todo_done')
    .filter((e) => e.data?.todoId === todoId)
    .first()
}

export async function toggleTodo(id: number) {
  const todo = await db.todos.get(id)
  if (!todo) return
  if (todo.done) {
    const e = await todoEvent(id)
    if (e) await db.events.delete(e.id)
    await db.todos.update(id, { done: false, doneAt: undefined })
  } else {
    await db.todos.update(id, { done: true, doneAt: Date.now() })
    await logEvent('todo_done', { todoId: id, subjectId: todo.subjectId })
  }
}

export async function deleteTodo(id: number) {
  const e = await todoEvent(id)
  if (e) await db.events.delete(e.id)
  await db.todos.delete(id)
}

export function useSubjects() {
  return useLiveQuery(() => db.subjects.orderBy('order').toArray())
}

export function useTodos() {
  return useLiveQuery(() => db.todos.toArray())
}

export function useDueTodos(withinDays: number) {
  return useLiveQuery(async () => {
    const today = await currentDay()
    const names = new Map((await db.subjects.toArray()).map((s) => [s.id, s.name]))
    const todos = await db.todos.where('due').aboveOrEqual('0').filter((t) => !t.done).toArray()
    return todos
      .map((t) => ({ ...t, subject: names.get(t.subjectId) ?? '', daysLeft: daysBetween(today, t.due!) }))
      .filter((t) => t.daysLeft <= withinDays)
      .sort((a, b) => a.due!.localeCompare(b.due!))
  })
}

export function daysBetween(from: string, to: string) {
  return differenceInCalendarDays(parseISO(to), parseISO(from))
}

export function useStudyToday() {
  return useLiveQuery(async () => {
    const day = await currentDay()
    const events = await db.events.where('[type+day]').equals(['study_session', day]).toArray()
    return { count: events.length, minutes: events.reduce((a, e) => a + Number(e.data?.minutes ?? 0), 0) }
  })
}

export async function startStudy(subjectId: number) {
  const minutes = await getSetting('focusMinutes')
  await setSetting('studyTimer', { subjectId, phase: 'focus', endsAt: Date.now() + minutes * 60_000, total: minutes * 60 })
}

export function stopStudy() {
  return setSetting('studyTimer', null)
}

export async function finishStudyIfDue(now = Date.now()) {
  return db.transaction('rw', db.settings, db.events, async () => {
    const timer = await getSetting('studyTimer')
    if (!timer || timer.endsAt > now) return null
    if (timer.phase === 'break') {
      await setSetting('studyTimer', null)
      return 'break'
    }
    const brk = await getSetting('breakMinutes')
    await logEvent('study_session', { subjectId: timer.subjectId, minutes: Math.round(timer.total / 60) }, new Date(timer.endsAt))
    await setSetting('studyTimer', { ...timer, phase: 'break', endsAt: now + brk * 60_000, total: brk * 60 })
    return 'focus'
  })
}
