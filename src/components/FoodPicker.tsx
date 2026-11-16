import { useMemo, useState } from 'react'
import { Button, Chips, Dialog, NumberInput, TextField } from './ui'
import type { FoodRecord, FoodUnit, Macros } from '../db/db'
import { useOnlineSearch } from '../lib/foodApi'
import { createIndex, useBaseSearch } from '../lib/foodSearch'
import { adoptFood, fmtAmount, fmtNum, portion, saveOwnFood, toggleFavorite, useFoods, type NewFood } from '../lib/nutrition'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (food: FoodRecord, grams: number) => void
  title?: string
  action?: string
}

const EMPTY: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
const UNITS = ['g', 'ml'] as const

export function MacroLine({ m, className = '' }: { m: Macros; className?: string }) {
  return (
    <span className={`text-xs text-sys-muted ${className}`}>
      {fmtNum(m.kcal)} kcal · E {fmtNum(m.protein)} · K {fmtNum(m.carbs)} · F {fmtNum(m.fat)}
    </span>
  )
}

const keyOf = (f: { barcode?: string; ref?: string }) => f.barcode ?? f.ref

export function FoodPicker({ open, onClose, onPick, title = 'Lebensmittel', action = 'Hinzufügen' }: Props) {
  const foods = useFoods()
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState<FoodRecord | null>(null)
  const [grams, setGrams] = useState(100)
  const [creating, setCreating] = useState(false)
  const [own, setOwn] = useState<Macros & { name: string; unit: FoodUnit }>({ name: '', unit: 'g', ...EMPTY })
  const searching = open && !chosen && !creating
  const online = useOnlineSearch(search, searching)
  const base = useBaseSearch(search, open)

  const q = search.trim()
  const ownSearch = useMemo(
    () => createIndex((foods ?? []).map((f) => ({ id: f.id, name: f.name, brand: f.brand }))),
    [foods],
  )
  const byId = new Map(foods?.map((f) => [f.id, f]))
  const shown = q
    ? ownSearch(q, 30).flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
    : [...(foods ?? []).filter((f) => f.favorite), ...(foods ?? []).filter((f) => !f.favorite)].slice(0, 30)
  const known = new Set(foods?.map(keyOf).filter(Boolean))
  const baseHits = base.results.filter((r) => !known.has(keyOf(r)))
  const baseKeys = new Set(base.results.map(keyOf))
  const remote = online.results.filter((r) => !known.has(keyOf(r)) && !baseKeys.has(keyOf(r)))

  const close = () => {
    setChosen(null)
    setCreating(false)
    setSearch('')
    onClose()
  }
  const choose = (f: FoodRecord) => {
    setChosen(f)
    setGrams(f.lastGrams ?? (f.unit === 'ml' ? 250 : 100))
  }
  const adopt = async (r: NewFood) => choose(await adoptFood(r))
  const createOwn = async () => {
    const food = { ...own, name: own.name.trim() }
    const id = await saveOwnFood(food)
    setCreating(false)
    setOwn({ name: '', unit: 'g', ...EMPTY })
    choose({ ...food, id, source: 'own' })
  }
  const confirm = () => {
    if (!chosen) return
    onPick(chosen, grams)
    close()
  }

  const row = (key: string, f: NewFood, onClick: () => void, extra?: string, star?: FoodRecord) => (
    <li key={key} className="flex items-center gap-2">
      <button type="button" className="min-w-0 flex-1 py-2 text-left" onClick={onClick}>
        <div className="truncate">{f.name}</div>
        <div className="truncate text-xs text-sys-muted">
          {f.brand ? `${f.brand} · ` : ''}
          {fmtNum(f.kcal)} kcal / 100 {f.unit ?? 'g'}
          {extra ? ` · ${extra}` : ''}
        </div>
      </button>
      {star && (
        <button
          type="button"
          aria-label="Favorit"
          className={`px-2 text-xl ${star.favorite ? 'text-sys-glow' : 'text-sys-muted/50'}`}
          onClick={() => toggleFavorite(star)}
        >
          {star.favorite ? '★' : '☆'}
        </button>
      )}
    </li>
  )

  const unit = chosen?.unit ?? 'g'

  return (
    <Dialog open={open} onClose={close} title={chosen ? chosen.name : creating ? 'Eigenes Lebensmittel' : title}>
      {chosen ? (
        <div className="space-y-3">
          {chosen.brand && <p className="text-center text-sm text-sys-muted">{chosen.brand}</p>}
          <NumberInput label="Menge" unit={unit} step={unit === 'ml' ? 50 : 10} min={1} value={grams} onChange={setGrams} />
          {unit === 'ml' && grams >= 1000 && <p className="text-center text-sm text-sys-muted">= {fmtAmount(grams, 'ml')}</p>}
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
          <Chips label="Einheit" options={UNITS} value={own.unit} onChange={(unit) => setOwn({ ...own, unit })} />
          <p className="text-xs text-sys-muted">Werte pro 100 {own.unit}</p>
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
          <TextField value={search} onChange={setSearch} placeholder="Suchen, z. B. Milch 1,5 oder Whey" />
          <ul className="divide-y divide-sys-line">
            {shown.map((f) => row(`o${f.id}`, f, () => choose(f), undefined, f))}
            {baseHits.map((r) => row(`b${keyOf(r)}`, r, () => adopt(r), r.source === 'base' ? 'Grundnahrungsmittel' : undefined))}
            {remote.map((r, i) => row(`r${r.barcode ?? i}`, r, () => adopt(r), 'online'))}
          </ul>
          <p className="text-center text-xs text-sys-muted">
            {q && !base.ready && 'Datenbank wird geladen …'}
            {online.status === 'loading' && ' Suche online …'}
            {online.status === 'offline' && 'Offline: nur eingebaute Datenbank.'}
            {online.status === 'error' && 'Online-Suche fehlgeschlagen.'}
            {online.status === 'done' && !shown.length && !baseHits.length && !remote.length && 'Nichts gefunden.'}
            {!q && !shown.length && 'Tippe, um über 10.000 Lebensmittel zu durchsuchen.'}
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
