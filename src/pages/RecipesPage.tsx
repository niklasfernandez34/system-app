import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button, Chips, Dialog, SystemWindow, TextField } from '../components/ui'
import { MEAL_SLOTS, type FoodRecord, type MealSlot, type RecipeRecord } from '../db/db'
import { normalize } from '../lib/foodSearch'
import { addRecipe, fmtNum, portion, sumMacros, useDayNutrition, useFoods, useRecipes } from '../lib/nutrition'

const SORTS = ['A–Z', 'Mahlzeit', 'Zuletzt benutzt'] as const
type Sort = (typeof SORTS)[number]
const SORT_KEY = 'recipeSort'
const NONE = 'Ohne Mahlzeit'

function loadSort(): Sort {
  try {
    const v = localStorage.getItem(SORT_KEY) as Sort | null
    return v && SORTS.includes(v) ? v : 'A–Z'
  } catch {
    return 'A–Z'
  }
}

const byName = (a: RecipeRecord, b: RecipeRecord) => a.name.localeCompare(b.name, 'de')

export function RecipesPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tag = params.get('tag') ?? undefined
  const data = useDayNutrition(tag)
  const recipes = useRecipes()
  const foods = useFoods()
  const [sort, setSortState] = useState<Sort>(loadSort)
  const [search, setSearch] = useState('')
  const [askSlot, setAskSlot] = useState<RecipeRecord | null>(null)

  const setSort = (s: Sort) => {
    setSortState(s)
    try {
      localStorage.setItem(SORT_KEY, s)
    } catch {
      /* egal */
    }
  }

  const byId = new Map(foods?.map((f) => [f.id, f]))
  const q = normalize(search.trim())
  const list = (recipes ?? []).filter((r) => !q || normalize(r.name).includes(q))

  const groups: [string, RecipeRecord[]][] =
    sort === 'Mahlzeit'
      ? [...MEAL_SLOTS, NONE]
          .map((s): [string, RecipeRecord[]] => [s, list.filter((r) => (r.slot ?? NONE) === s).sort(byName)])
          .filter(([, l]) => l.length)
      : [['', [...list].sort(sort === 'A–Z' ? byName : (a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))]]

  const apply = async (recipe: RecipeRecord, slot: MealSlot) => {
    if (!data) return
    await addRecipe(data.day, slot, recipe)
    navigate(data.day === data.today ? '/ernaehrung' : `/ernaehrung?tag=${data.day}`)
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Rezepte">
        <div className="space-y-3">
          <TextField value={search} onChange={setSearch} placeholder="Rezept suchen" />
          <Chips label="Sortieren" options={SORTS} value={sort} onChange={setSort} />
          {data && data.day !== data.today && (
            <p className="text-xs text-sys-muted">Wird zum {data.day.split('-').reverse().join('.')} hinzugefügt.</p>
          )}
        </div>
      </SystemWindow>

      {!recipes?.length && (
        <SystemWindow>
          <p className="text-center text-sys-muted">Noch keine Rezepte gespeichert.</p>
        </SystemWindow>
      )}

      {groups.map(([title, items]) => (
        <SystemWindow key={title || 'alle'} title={title || undefined}>
          <ul className="divide-y divide-sys-line">
            {items.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 py-2 text-left"
                  onClick={() => (r.slot ? apply(r, r.slot) : setAskSlot(r))}
                >
                  <div className="truncate">+ {r.name}</div>
                  <div className="text-xs text-sys-muted">
                    {r.slot ?? 'Mahlzeit wählen'} · {r.items.length} Zutaten · {fmtNum(recipeKcal(r, byId))} kcal
                  </div>
                </button>
                <Button variant="ghost" className="px-3" onClick={() => navigate(`/ernaehrung/rezept/${r.id}`)}>
                  ✎
                </Button>
              </li>
            ))}
          </ul>
        </SystemWindow>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Zurück
        </Button>
        <Button onClick={() => navigate('/ernaehrung/rezept/neu')}>+ Neues Rezept</Button>
      </div>

      <Dialog open={!!askSlot} onClose={() => setAskSlot(null)} title="Zu welcher Mahlzeit?">
        <p className="mb-3 text-center text-sm text-sys-muted">Gilt nur für diesen Tag.</p>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_SLOTS.map((s) => (
            <Button
              key={s}
              onClick={() => {
                if (askSlot) apply(askSlot, s)
                setAskSlot(null)
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      </Dialog>
    </div>
  )
}

function recipeKcal(r: RecipeRecord, byId: Map<number, FoodRecord>) {
  return sumMacros(r.items.flatMap((it) => (byId.has(it.foodId) ? [portion(byId.get(it.foodId)!, it.grams)] : []))).kcal
}
