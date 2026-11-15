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
} as const

export type EventType = keyof typeof XP
