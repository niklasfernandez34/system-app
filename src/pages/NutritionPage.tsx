import { addDays, format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button, Chips, Dialog, NumberInput, ProgressBar, SystemWindow } from '../components/ui'
import { GOAL_MODES } from '../lib/calorieCalc'
import { usePlanStatus } from '../lib/nutritionPlan'
import { FoodPicker, MacroLine } from '../components/FoodPicker'
import { NutritionSummary } from '../components/NutritionSummary'
import { MEAL_SLOTS, type MealRecord, type MealSlot } from '../db/db'
import { setSetting } from '../db/settings'
import {
  addFood,
  addWater,
  deleteGroup,
  deleteMeal,
  fmtAmount,
  fmtNum,
  groupMeals,
  mealTotals,
  portion,
  syncNutrition,
  updateMealGrams,
  useDayNutrition,
  type Goals,
} from '../lib/nutrition'

const WATER_STEPS = [250, 500]
const shift = (day: string, d: number) => format(addDays(parseISO(day), d), 'yyyy-MM-dd')

export function NutritionPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [day, setDay] = useState<string | undefined>(params.get('tag') ?? undefined)
  const data = useDayNutrition(day)
  const [adding, setAdding] = useState<MealSlot | null>(null)
  const [editing, setEditing] = useState<MealRecord | null>(null)
  const [goalsOpen, setGoalsOpen] = useState(false)

  if (!data) return null
  const slots = groupMeals(data.meals)
  const isToday = data.day === data.today

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="px-4" onClick={() => setDay(shift(data.day, -1))}>
          ‹
        </Button>
        <span className="text-center font-semibold">
          {isToday ? 'Heute' : format(parseISO(data.day), 'EEEE, d. MMMM', { locale: de })}
        </span>
        <Button variant="ghost" className="px-4" disabled={isToday} onClick={() => setDay(shift(data.day, 1))}>
          ›
        </Button>
      </div>

      <SystemWindow title="Tagesbilanz">
        <NutritionSummary totals={data.totals} goals={data.goals} />
        <PlanStatus />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setGoalsOpen(true)}>
            Ziele
          </Button>
          <Button variant="ghost" onClick={() => navigate('/ernaehrung/rechner')}>
            Rechner
          </Button>
        </div>
      </SystemWindow>

      <SystemWindow title="Wasser">
        <ProgressBar label="Wasser (ml)" value={data.water} max={data.goals.water} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="ghost" disabled={!data.water} onClick={() => addWater(data.day, -250)}>
            −250
          </Button>
          {WATER_STEPS.map((ml) => (
            <Button key={ml} onClick={() => addWater(data.day, ml)}>
              +{ml}
            </Button>
          ))}
        </div>
      </SystemWindow>

      <Button className="w-full" onClick={() => navigate(isToday ? '/ernaehrung/rezepte' : `/ernaehrung/rezepte?tag=${data.day}`)}>
        Rezepte
      </Button>

      {MEAL_SLOTS.map((slot) => {
        const groups = slots.get(slot)!
        const kcal = mealTotals(groups.flatMap((g) => g.items)).kcal
        return (
          <SystemWindow key={slot} title={slot}>
            {groups.length > 0 && (
              <ul className="mb-3 divide-y divide-sys-line">
                {groups.map((g) =>
                  g.recipeName ? (
                    <li key={g.group} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sys-glow">{g.recipeName}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-sys-muted">{fmtNum(mealTotals(g.items).kcal)} kcal</span>
                          <button
                            type="button"
                            aria-label="Rezept entfernen"
                            className="px-2 text-sys-muted"
                            onClick={() => deleteGroup(data.day, g.group)}
                          >
                            ×
                          </button>
                        </span>
                      </div>
                      <ul className="mt-1 border-l border-sys-line pl-3">
                        {g.items.map((m) => (
                          <MealRow key={m.id} meal={m} onEdit={setEditing} />
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <MealRow key={g.group} meal={g.items[0]} onEdit={setEditing} />
                  ),
                )}
              </ul>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-sys-muted">{groups.length ? `${fmtNum(kcal)} kcal` : 'Noch nichts'}</span>
              <Button variant="ghost" onClick={() => setAdding(slot)}>
                + Hinzufügen
              </Button>
            </div>
          </SystemWindow>
        )
      })}

      <FoodPicker
        open={!!adding}
        onClose={() => setAdding(null)}
        title={adding ?? ''}
        onPick={(food, grams) => adding && addFood(data.day, adding, food, grams)}
      />

      <MealDialog meal={editing} onClose={() => setEditing(null)} />

      <GoalsDialog
        open={goalsOpen}
        goals={data.goals}
        onClose={() => {
          setGoalsOpen(false)
          syncNutrition(data.day)
        }}
      />
    </div>
  )
}

function MealRow({ meal, onEdit }: { meal: MealRecord; onEdit: (m: MealRecord) => void }) {
  return (
    <li>
      <button type="button" className="flex w-full items-center justify-between gap-2 py-2 text-left" onClick={() => onEdit(meal)}>
        <span className="min-w-0">
          <span className="block truncate">{meal.name}</span>
          <span className="text-xs text-sys-muted">{fmtAmount(meal.grams, meal.unit)}</span>
        </span>
        <span className="shrink-0 text-sm text-sys-muted">{fmtNum(portion(meal.per100, meal.grams).kcal)} kcal</span>
      </button>
    </li>
  )
}

function MealDialog({ meal, onClose }: { meal: MealRecord | null; onClose: () => void }) {
  return (
    <Dialog open={!!meal} onClose={onClose} title={meal?.name}>
      {meal && <MealForm key={meal.id} meal={meal} onClose={onClose} />}
    </Dialog>
  )
}

function MealForm({ meal, onClose }: { meal: MealRecord; onClose: () => void }) {
  const [grams, setGrams] = useState(meal.grams)
  return (
    <div className="space-y-3">
      {meal.recipeName && (
        <p className="text-center text-xs text-sys-muted">Aus „{meal.recipeName}“ – ändert nur diesen Tag, nicht das Rezept.</p>
      )}
      <NumberInput
        label="Menge"
        unit={meal.unit ?? 'g'}
        step={meal.unit === 'ml' ? 50 : 10}
        min={1}
        value={grams}
        onChange={setGrams}
      />
      <p className="text-center">
        <MacroLine m={portion(meal.per100, grams)} className="text-sm" />
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="danger"
          onClick={async () => {
            await deleteMeal(meal)
            onClose()
          }}
        >
          Löschen
        </Button>
        <Button
          disabled={!(grams > 0)}
          onClick={async () => {
            await updateMealGrams(meal, grams)
            onClose()
          }}
        >
          Speichern
        </Button>
      </div>
    </div>
  )
}

function GoalsDialog({ open, goals, onClose }: { open: boolean; goals: Goals; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Tagesziele">
      <div className="space-y-3">
        <Chips
          label="Ziel"
          options={GOAL_MODES.map((m) => m.label)}
          value={GOAL_MODES.find((m) => m.mode === goals.mode)!.label}
          onChange={(l) => setSetting('goalMode', GOAL_MODES.find((m) => m.label === l)!.mode)}
        />
        <NumberInput label="Kalorien" unit="kcal" step={50} min={0} value={goals.kcal} onChange={(v) => setSetting('kcalGoal', v)} />
        <NumberInput label="Eiweiß" unit="g" step={5} min={0} value={goals.protein} onChange={(v) => setSetting('proteinGoal', v)} />
        <NumberInput label="Kohlenhydrate" unit="g" step={10} min={0} value={goals.carbs} onChange={(v) => setSetting('carbsGoal', v)} />
        <NumberInput label="Fett" unit="g" step={5} min={0} value={goals.fat} onChange={(v) => setSetting('fatGoal', v)} />
        <NumberInput label="Wasser" unit="ml" step={250} min={0} value={goals.water} onChange={(v) => setSetting('waterGoal', v)} />
        <p className="text-xs text-sys-muted">
          Kalorienziel erreicht: Abnehmen 80–100 %, Halten 90–110 %, Zunehmen ab 100 %. Eiweiß und Wasser: mindestens das Ziel.
        </p>
        <Button className="w-full" onClick={onClose}>
          Fertig
        </Button>
      </div>
    </Dialog>
  )
}

const kg = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${(Math.round(Math.abs(n) * 10) / 10).toLocaleString('de-DE')} kg/Woche`

function PlanStatus() {
  const status = usePlanStatus()
  if (!status) return null
  const { plan, trend } = status
  const label = GOAL_MODES.find((m) => m.mode === plan.mode)!.label
  return (
    <p className="mt-3 text-center text-xs text-sys-muted">
      Ziel: {label}
      {plan.rate !== 0 && ` ${kg(plan.rate)}`} · Trend: {trend === null ? 'noch zu wenig Wiegungen' : kg(trend)}
    </p>
  )
}
