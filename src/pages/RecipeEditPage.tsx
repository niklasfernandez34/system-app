import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, Chips, Dialog, NumberInput, SystemWindow, TextField } from '../components/ui'
import { FoodPicker, MacroLine } from '../components/FoodPicker'
import { MEAL_SLOTS, type RecipeRecord } from '../db/db'
import { deleteRecipe, fmtAmount, fmtNum, portion, saveRecipe, sumMacros, useFoods, useRecipe } from '../lib/nutrition'

const NONE = 'Keine'
const SLOT_OPTIONS = [NONE, ...MEAL_SLOTS] as const

export function RecipeEditPage() {
  const { id } = useParams()
  const recipeId = id === 'neu' ? undefined : Number(id)
  const recipe = useRecipe(recipeId)
  if (recipeId && !recipe) return null
  return <RecipeForm key={recipeId ?? 'neu'} recipe={recipe} />
}

function RecipeForm({ recipe }: { recipe?: RecipeRecord }) {
  const navigate = useNavigate()
  const foods = useFoods()
  const [name, setName] = useState(recipe?.name ?? '')
  const [slot, setSlot] = useState<(typeof SLOT_OPTIONS)[number]>(recipe?.slot ?? NONE)
  const [items, setItems] = useState(recipe?.items ?? [])
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const byId = new Map(foods?.map((f) => [f.id, f]))
  const totals = sumMacros(items.flatMap((it) => (byId.has(it.foodId) ? [portion(byId.get(it.foodId)!, it.grams)] : [])))
  const edit = editing !== null ? items[editing] : undefined
  const back = () => navigate(-1)

  const save = async () => {
    await saveRecipe({ id: recipe?.id, name: name.trim(), slot: slot === NONE ? undefined : slot, items })
    back()
  }

  return (
    <div className="space-y-4">
      <SystemWindow title={recipe ? 'Rezept bearbeiten' : 'Neues Rezept'}>
        <div className="space-y-3">
          <TextField label="Name" value={name} onChange={setName} placeholder="z. B. Nudelauflauf" />
          <Chips label="Mahlzeit" options={SLOT_OPTIONS} value={slot} onChange={setSlot} />
          <p className="text-xs text-sys-muted">
            {slot === NONE ? 'Beim Hinzufügen wird jedes Mal gefragt.' : `Wird automatisch zu ${slot} hinzugefügt.`}
          </p>
        </div>
      </SystemWindow>

      <SystemWindow title="Zutaten">
        {!items.length && <p className="mb-3 text-center text-sys-muted">Noch keine Zutaten.</p>}
        <ul className="mb-3 divide-y divide-sys-line">
          {items.map((it, i) => {
            const food = byId.get(it.foodId)
            return (
              <li key={i}>
                <button type="button" className="flex w-full items-center justify-between gap-2 py-2 text-left" onClick={() => setEditing(i)}>
                  <span className="min-w-0">
                    <span className="block truncate">{food?.name ?? '?'}</span>
                    <span className="text-xs text-sys-muted">{fmtAmount(it.grams, food?.unit)}</span>
                  </span>
                  <span className="shrink-0 text-sm text-sys-muted">
                    {food ? `${fmtNum(portion(food, it.grams).kcal)} kcal` : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {items.length > 0 && (
          <p className="mb-3 text-center">
            <MacroLine m={totals} className="text-sm" />
          </p>
        )}
        <Button variant="ghost" className="w-full" onClick={() => setPicking(true)}>
          + Zutat hinzufügen
        </Button>
      </SystemWindow>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={back}>
          Abbrechen
        </Button>
        <Button disabled={!name.trim() || !items.length} onClick={save}>
          Speichern
        </Button>
      </div>
      {recipe && (
        <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
          Rezept löschen
        </Button>
      )}

      <FoodPicker
        open={picking}
        onClose={() => setPicking(false)}
        title="Zutat"
        action="Übernehmen"
        onPick={(food, grams) => setItems([...items, { foodId: food.id, grams }])}
      />

      <Dialog open={!!edit} onClose={() => setEditing(null)} title={edit ? byId.get(edit.foodId)?.name : ''}>
        {edit && editing !== null && (
          <div className="space-y-3">
            <NumberInput
              label="Menge"
              unit={byId.get(edit.foodId)?.unit ?? 'g'}
              step={byId.get(edit.foodId)?.unit === 'ml' ? 50 : 10}
              min={1}
              value={edit.grams}
              onChange={(grams) => setItems(items.map((it, j) => (j === editing ? { ...it, grams } : it)))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  setItems(items.filter((_, j) => j !== editing))
                  setEditing(null)
                }}
              >
                Entfernen
              </Button>
              <Button onClick={() => setEditing(null)}>Fertig</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Rezept löschen?">
        <p className="mb-3 text-sys-muted">Bereits eingetragene Mahlzeiten bleiben erhalten.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Nein
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (recipe) await deleteRecipe(recipe.id)
              back()
            }}
          >
            Löschen
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
