import { useState } from 'react'
import { Button, Dialog, SystemWindow, TextField } from './ui'
import { XP } from '../config/xp'
import type { SkinRoutine } from '../db/db'
import { addStep, moveStep, ROUTINES, toggleStep, updateStep, useRoutines } from '../lib/skin'

export function SkinRoutines({ compact = false }: { compact?: boolean }) {
  const routines = useRoutines()
  const [editing, setEditing] = useState<SkinRoutine | null>(null)
  const [name, setName] = useState('')

  if (!routines) return null
  const shown = compact ? routines.filter((r) => r.steps.length) : routines
  if (compact && !shown.length) return null
  const current = routines.find((r) => r.id === editing)

  const add = async () => {
    if (!editing || !name.trim()) return
    await addStep(editing, name.trim())
    setName('')
  }

  return (
    <>
      {shown.map((r) => (
        <SystemWindow key={r.id} title={r.label}>
          {!r.steps.length && <p className="mb-3 text-center text-sm text-sys-muted">Noch keine Schritte.</p>}
          <ul className="space-y-2">
            {r.steps.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => toggleStep(s.id, r.id)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-md border px-3 text-left transition-colors ${
                    s.done ? 'border-sys-glow bg-sys-glow/15 shadow-glow' : 'border-sys-line active:bg-sys-line/30'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
                      s.done ? 'border-sys-glow bg-sys-glow text-sys-bg' : 'border-sys-muted'
                    }`}
                  >
                    {s.done ? '✓' : ''}
                  </span>
                  <span className={s.done ? 'text-sys-text' : 'text-sys-muted'}>{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={`mt-3 text-center text-xs ${r.complete ? 'text-sys-glow' : 'text-sys-muted'}`}>
            {r.complete ? `✓ Komplett · +${XP.skin_routine_done} XP (Charisma)` : `Komplett: +${XP.skin_routine_done} XP (Charisma)`}
          </p>
          {!compact && (
            <Button variant="ghost" className="mt-3 w-full" onClick={() => setEditing(r.id)}>
              Schritte bearbeiten
            </Button>
          )}
        </SystemWindow>
      ))}

      <Dialog open={!!current} onClose={() => setEditing(null)} title={current ? `${current.label} bearbeiten` : ''}>
        {current && (
          <div className="space-y-3">
            <ul className="divide-y divide-sys-line">
              {current.steps.map((s, i) => (
                <StepRow key={s.id} id={s.id} name={s.name} first={i === 0} last={i === current.steps.length - 1} />
              ))}
            </ul>
            <div className="flex gap-2">
              <div className="flex-1">
                <TextField value={name} onChange={setName} placeholder="Neuer Schritt, z. B. Reinigen" />
              </div>
              <Button onClick={add} disabled={!name.trim()}>
                +
              </Button>
            </div>
            {current.archived.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-sys-muted">Archiviert</p>
                <ul className="divide-y divide-sys-line">
                  {current.archived.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 py-2">
                      <span className="flex-1 text-sys-muted">{s.name}</span>
                      <Button variant="ghost" onClick={() => updateStep(s.id, { archived: false })}>
                        Zurückholen
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button className="w-full" onClick={() => setEditing(null)}>
              Fertig
            </Button>
          </div>
        )}
      </Dialog>
    </>
  )
}

function StepRow({ id, name, first, last }: { id: number; name: string; first: boolean; last: boolean }) {
  const [value, setValue] = useState(name)
  return (
    <li className="flex items-center gap-1 py-2">
      <div className="flex-1">
        <TextField value={value} onChange={setValue} />
      </div>
      {value.trim() && value.trim() !== name && (
        <Button className="px-3" onClick={() => updateStep(id, { name: value.trim() })}>
          ✓
        </Button>
      )}
      <Button variant="ghost" className="px-2" disabled={first} onClick={() => moveStep(id, -1)} aria-label="Nach oben">
        ↑
      </Button>
      <Button variant="ghost" className="px-2" disabled={last} onClick={() => moveStep(id, 1)} aria-label="Nach unten">
        ↓
      </Button>
      <Button variant="ghost" className="px-2" onClick={() => updateStep(id, { archived: true })} aria-label="Archivieren">
        ✕
      </Button>
    </li>
  )
}

export const routineLabel = (r: SkinRoutine | 'both') => (r === 'both' ? 'Morgen- und Abendroutine' : ROUTINES.find((x) => x.id === r)!.label)
