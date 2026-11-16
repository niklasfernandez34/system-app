export const QUESTS = [
  { id: 'checkin', title: 'Täglicher Check-in', anyOf: ['checkin_done'] },
  { id: 'habits', title: 'Alle Habits abhaken', anyOf: [] },
  { id: 'move', title: 'Training oder Körperdaten', anyOf: ['workout_done', 'body_logged'] },
  { id: 'journal', title: 'Tagebuch schreiben', anyOf: ['journal_written'] },
  { id: 'food', title: 'Ernährung eintragen', anyOf: ['meal_logged'] },
  { id: 'study', title: 'Lernen (Timer oder Karteikarten)', anyOf: ['study_session', 'cards_round'] },
  { id: 'skin', title: 'Pflegeroutine', anyOf: [] },
] as const

export type QuestId = (typeof QUESTS)[number]['id']

export const PENALTY_QUESTS = [
  '50 Liegestütze',
  '100 Kniebeugen',
  '3 × 1 Minute Plank',
  '30 Minuten spazieren gehen',
  '50 Sit-ups',
  '20 Minuten lesen ohne Handy',
]
