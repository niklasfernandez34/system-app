import { useState } from 'react'
import { Button, Chips, Dialog, TextField } from './ui'
import { EQUIPMENT, MUSCLES } from '../config/sport'
import { addExercise, useExercises } from '../lib/sport'
import { adoptWger, matchesOwn, searchWger, useWger, type WgerExercise } from '../lib/wger'

type Props = { open: boolean; onClose: () => void; onPick: (exerciseId: number) => void }
type Tab = 'group' | 'equipment' | null

const ALL = 'Alle'
const NONE = 'Keins'
const GROUPS = [ALL, ...MUSCLES] as const
const TOOLS = [ALL, ...EQUIPMENT] as const

export function ExercisePicker({ open, onClose, onPick }: Props) {
  const exercises = useExercises()
  const wger = useWger()
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<(typeof GROUPS)[number]>(ALL)
  const [tool, setTool] = useState<(typeof TOOLS)[number]>(ALL)
  const [tab, setTab] = useState<Tab>(null)
  const [newName, setNewName] = useState('')
  const [muscle, setMuscle] = useState<(typeof MUSCLES)[number]>('Brust')
  const [newTool, setNewTool] = useState<string>(NONE)

  const filter = { query: search, group: group === ALL ? undefined : group, equipment: tool === ALL ? undefined : tool }
  const wgerById = new Map(wger?.map((w) => [w.id, w]))
  const own = exercises?.filter((e) => matchesOwn(e, filter, e.wgerId ? wgerById.get(e.wgerId) : undefined)) ?? []
  const ownWger = new Set(exercises?.map((e) => e.wgerId))
  const hits = wger ? searchWger(wger, filter).filter((w) => !ownWger.has(w.id)) : []
  const filtered = !!(filter.group || filter.equipment)

  const pick = (id: number) => {
    onPick(id)
    setSearch('')
  }
  const pickWger = async (w: WgerExercise) => pick(await adoptWger(w))
  const create = async () => {
    const id = await addExercise(newName.trim(), muscle, newTool === NONE ? undefined : newTool)
    setNewName('')
    pick(id)
  }

  const tabButton = (t: Exclude<Tab, null>, label: string, value: string) => (
    <button
      type="button"
      onClick={() => setTab(tab === t ? null : t)}
      className={`min-h-10 flex-1 rounded-xl border px-2 text-sm ${
        value !== ALL || tab === t ? 'border-sys-glow text-sys-text' : 'border-sys-line text-sys-muted'
      }`}
    >
      {label}: {value} {tab === t ? '▴' : '▾'}
    </button>
  )

  return (
    <Dialog open={open} onClose={onClose} title="Übung wählen">
      <div className="max-h-[80vh] space-y-3 overflow-y-auto outline-none">
        <TextField value={search} onChange={setSearch} placeholder="Suchen, z. B. Bankdrücken" />
        <div className="flex gap-2">
          {tabButton('group', 'Muskel', group)}
          {tabButton('equipment', 'Gerät', tool)}
        </div>
        {tab === 'group' && (
          <Chips
            options={GROUPS}
            value={group}
            onChange={(g) => {
              setGroup(g)
              if (g !== ALL) setMuscle(g)
              setTab(null)
            }}
          />
        )}
        {tab === 'equipment' && (
          <Chips
            options={TOOLS}
            value={tool}
            onChange={(t) => {
              setTool(t)
              if (t !== ALL) setNewTool(t)
              setTab(null)
            }}
          />
        )}

        <ul className="max-h-72 divide-y divide-sys-line overflow-y-auto pr-1 outline-none">
          {own.map((e) => (
            <li key={e.id}>
              <button type="button" className="flex w-full justify-between gap-2 py-2 text-left" onClick={() => pick(e.id)}>
                <span>{e.name}</span>
                <span className="shrink-0 text-xs text-sys-glow">{e.muscle} · meine</span>
              </button>
            </li>
          ))}
          {hits.map((w) => (
            <li key={`w${w.id}`}>
              <button type="button" className="flex w-full justify-between gap-2 py-2 text-left" onClick={() => pickWger(w)}>
                <span>{w.name}</span>
                <span className="shrink-0 text-xs text-sys-muted">{w.group}</span>
              </button>
            </li>
          ))}
        </ul>
        {search.trim().length < 2 && !filtered ? (
          <p className="text-center text-xs text-sys-muted">Suche oder wähle Muskel/Gerät, um ~970 Übungen zu durchsuchen.</p>
        ) : (
          <p className="text-center text-xs text-sys-muted">{own.length + hits.length} Übungen</p>
        )}

        <div className="space-y-3 border-t border-sys-line pt-3">
          <TextField label="Eigene Übung anlegen" value={newName} onChange={setNewName} placeholder="z. B. Bankdrücken" />
          <Chips label="Muskelgruppe" options={MUSCLES} value={muscle} onChange={setMuscle} />
          <Chips label="Gerät" options={[NONE, ...EQUIPMENT]} value={newTool} onChange={setNewTool} />
          <Button className="w-full" disabled={!newName.trim()} onClick={create}>
            Anlegen und hinzufügen
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
