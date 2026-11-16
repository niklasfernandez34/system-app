import { useState } from 'react'
import { Button, Dialog, NumberInput, TextField } from './ui'
import type { FoodRecord, Macros } from '../db/db'
import { useOnlineSearch } from '../lib/foodApi'
import {
  adoptFood,
  fmtNum,
  matchesFood,
  portion,
  saveOwnFood,
  toggleFavorite,
  useFoods,
  type NewFood,
} from '../lib/nutrition'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (food: FoodRecord, grams: number) => void
  title?: string
  action?: string
}

const EMPTY: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export function MacroLine({ m, className = '' }: { m: Macros; className?: string }) {
  return (
    <span className={`text-xs text-sys-muted ${className}`}>
      {fmtNum(m.kcal)} kcal · E {fmtNum(m.protein)} · K {fmtNum(m.carbs)} · F {fmtNum(m.fat)}
    </span>
  )
}

export function FoodPicker({ open, onClose, onPick, title = 'Lebensmittel', action = 'Hinzufügen' }: Props) {
  const foods = useFoods()
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState<FoodRecord | null>(null)
  const [grams, setGrams] = useState(100)
  const [creating, setCreating] = useState(false)
  const [own, setOwn] = useState({ name: '', ...EMPTY })
  const online = useOnlineSearch(search, open && !chosen && !creating)

  const q = search.trim()
  const local = (foods ?? []).filter((f) => (q ? matchesFood(f, q) : true))
  const shown = q ? local.slice(0, 30) : [...local.filter((f) => f.favorite), ...local.filter((f) => !f.favorite)].slice(0, 30)
  const known = new Set(foods?.map((f) => f.barcode).filter(Boolean))
  const remote = online.results.filter((r) => !r.barcode || !known.has(r.barcode))

  const close = () => {
    setChosen(null)
    setCreating(false)
    setSearch('')
    onClose()
  }
  const choose = (f: FoodRecord) => {
    setChosen(f)
    setGrams(f.lastGrams ?? 100)
  }
  const chooseRemote = async (r: NewFood) => choose(await adoptFood(r))
  const createOwn = async () => {
    const id = await saveOwnFood({ ...own, name: own.name.trim() })
    setCreating(false)
    setOwn({ name: '', ...EMPTY })
    choose({ ...own, id, source: 'own' })
  }
  const confirm = () => {
    if (!chosen) return
    onPick(chosen, grams)
    close()
  }

  return (
    <Dialog open={open} onClose={close} title={chosen ? chosen.name : creating ? 'Eigenes Lebensmittel' : title}>
      {chosen ? (
        <div className="space-y-3">
          {chosen.brand && <p className="text-center text-sm text-sys-muted">{chosen.brand}</p>}
          <NumberInput label="Menge" unit="g" step={10} min={1} value={grams} onChange={setGrams} />
          <p className="text-center">
            <MacroLine m={portion(chosen, grams)} className="text-sm" />
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setChosen(null)}>
              Zurück
            </Button>
            <Button disabled={!(grams > 0)} onClick={confirm}>
              {action}
            </Button>
          </div>
        </div>
      ) : creating ? (
        <div className="space-y-3">
          <TextField label="Name" value={own.name} onChange={(name) => setOwn({ ...own, name })} placeholder="z. B. Omas Brot" />
          <p className="text-xs text-sys-muted">Werte pro 100 g</p>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="kcal" step={10} min={0} value={own.kcal} onChange={(kcal) => setOwn({ ...own, kcal })} />
            <NumberInput label="Eiweiß (g)" min={0} value={own.protein} onChange={(protein) => setOwn({ ...own, protein })} />
            <NumberInput label="Kohlenhydrate (g)" min={0} value={own.carbs} onChange={(carbs) => setOwn({ ...own, carbs })} />
            <NumberInput label="Fett (g)" min={0} value={own.fat} onChange={(fat) => setOwn({ ...own, fat })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Zurück
            </Button>
            <Button disabled={!own.name.trim()} onClick={createOwn}>
              Anlegen
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-h-[80vh] space-y-3 overflow-y-auto outline-none">
          <TextField value={search} onChange={setSearch} placeholder="Suchen, z. B. Haferflocken" />
          <ul className="divide-y divide-sys-line">
            {shown.map((f) => (
              <li key={f.id} className="flex items-center gap-2">
                <button type="button" className="min-w-0 flex-1 py-2 text-left" onClick={() => choose(f)}>
                  <div className="truncate">{f.name}</div>
                  <div className="truncate text-xs text-sys-muted">
                    {f.brand ? `${f.brand} · ` : ''}
                    {fmtNum(f.kcal)} kcal / 100 g
                  </div>
                </button>
                <button
                  type="button"
                  aria-label="Favorit"
                  className={`px-2 text-xl ${f.favorite ? 'text-sys-glow' : 'text-sys-muted/50'}`}
                  onClick={() => toggleFavorite(f)}
                >
                  {f.favorite ? '★' : '☆'}
                </button>
              </li>
            ))}
            {remote.map((r, i) => (
              <li key={`r${r.barcode ?? i}`}>
                <button type="button" className="w-full py-2 text-left" onClick={() => chooseRemote(r)}>
                  <div className="truncate">{r.name}</div>
                  <div className="truncate text-xs text-sys-muted">
                    {r.brand ? `${r.brand} · ` : ''}
                    {fmtNum(r.kcal)} kcal / 100 g · online
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-center text-xs text-sys-muted">
            {online.status === 'loading' && 'Suche online …'}
            {online.status === 'offline' && 'Offline: nur gespeicherte Lebensmittel.'}
            {online.status === 'error' && 'Online-Suche fehlgeschlagen.'}
            {online.status === 'done' && !shown.length && !remote.length && 'Nichts gefunden.'}
            {online.status === 'idle' && !shown.length && 'Mindestens 3 Buchstaben für die Online-Suche.'}
          </p>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOwn({ ...own, name: own.name || q })
              setCreating(true)
            }}
          >
            + Eigenes Lebensmittel
          </Button>
        </div>
      )}
    </Dialog>
  )
}
