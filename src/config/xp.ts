export const XP = {
  app_opened: 0,
  day_closed: 0,
  checkin_done: 10,
  journal_written: 5,
  habit_done: 5,
  note_added: 0,
  workout_done: 30,
  pr_set: 15,
  body_logged: 5,
  progress_photo: 5,
  quests_completed: 20,
  quest_failed: -10,
  penalty_done: 0,
  quest_streak: 50,
  rank_up: 0,
} as const

export type EventType = keyof typeof XP

export const STAGES_PER_RANK = 5
export const SPORT_CONDITIONS = 3
export const QUEST_STREAK_DAYS = 7

export const RANKS = [
  { rank: 'E', xp: 550, increase: 0.05, questDays: 5, habitStreak: 7 },
  { rank: 'D', xp: 1700, increase: 0.075, questDays: 15, habitStreak: 14 },
  { rank: 'C', xp: 5000, increase: 0.1, questDays: 40, habitStreak: 30 },
  { rank: 'B', xp: 12000, increase: 0.125, questDays: 90, habitStreak: 60 },
  { rank: 'A', xp: 30000, increase: 0.15, questDays: 180, habitStreak: 100 },
  { rank: 'S', xp: 30000, increase: 0, questDays: 0, habitStreak: 0 },
] as const

export type Rank = (typeof RANKS)[number]['rank']

export const ATTRIBUTES = {
  str: 'Stärke',
  int: 'Intelligenz',
  vit: 'Vitalität',
  cha: 'Charisma',
  wil: 'Willenskraft',
} as const

export type Attribute = keyof typeof ATTRIBUTES

export const ATTRIBUTE_OF: Partial<Record<EventType, Attribute>> = {
  workout_done: 'str',
  pr_set: 'str',
  body_logged: 'str',
  progress_photo: 'str',
  checkin_done: 'wil',
  journal_written: 'wil',
  habit_done: 'wil',
}

export const ATTRIBUTE_BASE = 10
export const ATTRIBUTE_XP_PER_POINT = 50

export const MAX_PENALTY_DAYS = 3
