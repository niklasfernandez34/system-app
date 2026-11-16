import Dexie, { type EntityTable } from 'dexie'

export type EventRecord = {
  id: number
  type: string
  at: number
  day: string
  data?: Record<string, unknown>
}

export type SettingRecord = {
  key: string
  value: unknown
}

export type PhotoRecord = {
  id: number
  kind: string
  createdAt: number
  blob: Blob
  day?: string
  pose?: string
}

export type HabitRecord = {
  id: number
  name: string
  order: number
  createdAt: number
  archived?: boolean
}

export type JournalRecord = {
  day: string
  sleepHours: number
  sleep: number
  energy: number
  mood: number
  text: string
  updatedAt: number
}

export type NoteRecord = {
  id: number
  text: string
  createdAt: number
  updatedAt: number
  ref?: string
}

export type ExerciseRecord = {
  id: number
  name: string
  muscle: string
  createdAt: number
  wgerId?: number
  equipment?: string
}

export type BodyRecord = {
  day: string
  weight?: number
  waist?: number
  chest?: number
  arm?: number
  thigh?: number
  hip?: number
  updatedAt: number
}

export type PlanItem = {
  exerciseId: number
  sets: number
  reps: number
  weight: number
}

export type PlanRecord = {
  id: number
  name: string
  order: number
  items: PlanItem[]
  archived?: boolean
}

export type WorkoutSet = {
  weight: number
  reps: number
  done: boolean
}

export type WorkoutEntry = {
  exerciseId: number
  targetReps: number
  lastWeight?: number
  sets: WorkoutSet[]
}

export type WorkoutRecord = {
  id: number
  planId: number
  day: string
  startedAt: number
  finishedAt: number
  restEndsAt?: number
  entries: WorkoutEntry[]
}

export type QuestRecord = {
  day: string
  evaluated?: boolean
  penalty?: { title: string; failed: number }
}

export type RankRecord = {
  rank: string
  startedAt: number
  startDay: string
  exercises: { exerciseId: number; baseline: number | null }[]
}

export type BossRecord = {
  id: number
  kind: 'lift'
  exerciseId: number
  target: number
  reps: number
  deadline: string
  createdAt: number
  status: 'active' | 'won' | 'lost'
}

export const MEAL_SLOTS = ['Frühstück', 'Mittag', 'Abend', 'Snack'] as const
export type MealSlot = (typeof MEAL_SLOTS)[number]

export type Macros = { kcal: number; protein: number; carbs: number; fat: number }

export type FoodRecord = Macros & {
  id: number
  name: string
  brand?: string
  barcode?: string
  source: 'own' | 'off'
  favorite?: boolean
  lastGrams?: number
  lastUsedAt?: number
}

export type MealRecord = {
  id: number
  day: string
  slot: MealSlot
  foodId: number
  name: string
  grams: number
  per100: Macros
  createdAt: number
  group: string
  recipeId?: number
  recipeName?: string
}

export type WaterRecord = { day: string; ml: number }

export type RecipeRecord = {
  id: number
  name: string
  slot?: MealSlot
  items: { foodId: number; grams: number }[]
  createdAt: number
  lastUsedAt?: number
}

export const db = new Dexie('system-app') as Dexie & {
  events: EntityTable<EventRecord, 'id'>
  settings: EntityTable<SettingRecord, 'key'>
  photos: EntityTable<PhotoRecord, 'id'>
  habits: EntityTable<HabitRecord, 'id'>
  journal: EntityTable<JournalRecord, 'day'>
  notes: EntityTable<NoteRecord, 'id'>
  exercises: EntityTable<ExerciseRecord, 'id'>
  plans: EntityTable<PlanRecord, 'id'>
  workouts: EntityTable<WorkoutRecord, 'id'>
  body: EntityTable<BodyRecord, 'day'>
  quests: EntityTable<QuestRecord, 'day'>
  ranks: EntityTable<RankRecord, 'rank'>
  bosses: EntityTable<BossRecord, 'id'>
  foods: EntityTable<FoodRecord, 'id'>
  meals: EntityTable<MealRecord, 'id'>
  water: EntityTable<WaterRecord, 'day'>
  recipes: EntityTable<RecipeRecord, 'id'>
}

db.version(1).stores({
  events: '++id, type, day, at, [type+day]',
  settings: 'key',
  photos: '++id, kind, createdAt',
})

db.version(2).stores({
  habits: '++id, order',
  journal: 'day',
  notes: '++id, createdAt, ref',
})

db.version(3).stores({
  exercises: '++id, name',
  plans: '++id, order',
  workouts: '++id, planId, day, startedAt, finishedAt',
})

db.version(4).stores({
  exercises: '++id, name, wgerId',
  body: 'day',
})

db.version(5).stores({
  quests: 'day',
})

db.version(6).stores({
  ranks: 'rank',
})

db.version(7).stores({
  bosses: '++id, status',
})

db.version(8).stores({
  foods: '++id, name, barcode, lastUsedAt',
  meals: '++id, day, group',
  water: 'day',
  recipes: '++id, name',
})
