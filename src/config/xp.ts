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
} as const

export type EventType = keyof typeof XP

export const LEVEL_BASE_XP = 100
export const LEVEL_STEP_XP = 20

export const RANKS = [
  { rank: 'E', from: 1 },
  { rank: 'D', from: 10 },
  { rank: 'C', from: 20 },
  { rank: 'B', from: 35 },
  { rank: 'A', from: 50 },
  { rank: 'S', from: 75 },
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
