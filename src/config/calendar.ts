export const CAL_PARTS = ['Training', 'Lernplan', 'Klausuren', 'Fristen', 'Pflegeroutine'] as const
export type CalPart = (typeof CAL_PARTS)[number]
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export type CalendarPrefs = {
  parts: CalPart[]
  trainingDays: Weekday[]
  trainingTime: string
  trainingMinutes: number
  morningTime: string
  eveningTime: string
}

export const DEFAULT_CALENDAR: CalendarPrefs = {
  parts: ['Training', 'Lernplan', 'Klausuren', 'Fristen'],
  trainingDays: ['Mo', 'Mi', 'Fr'],
  trainingTime: '18:00',
  trainingMinutes: 60,
  morningTime: '07:30',
  eveningTime: '22:00',
}
