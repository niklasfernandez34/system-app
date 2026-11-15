export const XP = {
  app_opened: 0,
  day_closed: 0,
} as const

export type EventType = keyof typeof XP
