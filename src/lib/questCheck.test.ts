import { describe, expect, it } from 'vitest'
import { PENALTY_QUESTS } from '../config/quests'
import { penaltyTitle, questStatus } from './questCheck'

describe('questStatus', () => {
  it('lässt die Habit-Quest ohne Habits weg', () => {
    expect(questStatus([], []).map((q) => q.id)).toEqual(['checkin', 'move', 'journal'])
  })
  it('erkennt erledigte Quests', () => {
    const events = [{ type: 'checkin_done' }, { type: 'body_logged' }, { type: 'habit_done', data: { habitId: 1 } }]
    const done = Object.fromEntries(questStatus(events, [1, 2]).map((q) => [q.id, q.done]))
    expect(done).toEqual({ checkin: true, habits: false, move: true, journal: false })
  })
  it('zählt Habits erst, wenn alle abgehakt sind', () => {
    const events = [1, 2].map((habitId) => ({ type: 'habit_done', data: { habitId } }))
    expect(questStatus(events, [1, 2]).find((q) => q.id === 'habits')?.done).toBe(true)
  })
})

describe('penaltyTitle', () => {
  it('wechselt täglich und wiederholt sich', () => {
    expect(penaltyTitle('2026-01-01')).toBe(PENALTY_QUESTS[0])
    expect(penaltyTitle('2026-01-02')).toBe(PENALTY_QUESTS[1])
    expect(penaltyTitle(`2026-01-0${1 + PENALTY_QUESTS.length}`)).toBe(PENALTY_QUESTS[0])
    expect(PENALTY_QUESTS).toContain(penaltyTitle('2025-06-01'))
  })
  it('verlangt alle Routinen mit Schritten für die Pflege-Quest', () => {
    expect(questStatus([], []).some((q) => q.id === 'skin')).toBe(false)
    const one = [{ type: 'skin_routine_done', data: { routine: 'evening' } }]
    expect(questStatus(one, [], false, ['evening']).find((q) => q.id === 'skin')?.done).toBe(true)
    expect(questStatus(one, [], false, ['morning', 'evening']).find((q) => q.id === 'skin')?.done).toBe(false)
  })
})
