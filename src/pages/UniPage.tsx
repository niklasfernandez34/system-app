import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Dialog, SystemWindow, TextField } from '../components/ui'
import { Deadlines } from '../components/Deadlines'
import { StudyTimer } from '../components/StudyTimer'
import { addSubject, updateSubject, useSubjectOverview } from '../lib/uni'

const inDays = (d: number) => (d > 1 ? `in ${d} T.` : d === 1 ? 'morgen' : d === 0 ? 'heute' : 'überfällig')

export function UniPage() {
  const subjects = useSubjectOverview()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const active = subjects?.filter((s) => !s.archived) ?? []
  const archived = subjects?.filter((s) => s.archived) ?? []

  const add = async () => {
    if (!name.trim()) return
    const id = await addSubject(name.trim())
    setName('')
    setAdding(false)
    navigate(`/uni/fach/${id}`)
  }

  return (
    <div className="space-y-4">
      <SystemWindow title="Lern-Timer">
        <StudyTimer />
      </SystemWindow>

      <Deadlines />

      <SystemWindow title="Fächer">
        <div className="grid grid-cols-2 gap-3">
          {active.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/uni/fach/${s.id}`)}
              className="flex min-h-24 flex-col justify-between rounded-lg border border-sys-glow/60 bg-sys-glow/5 p-3 text-left shadow-glow active:bg-sys-glow/20"
            >
              <span className="font-semibold leading-tight">{s.name}</span>
              <span className="mt-2 space-y-0.5 text-xs text-sys-muted">
                {s.examIn !== undefined && <span className="block text-sys-glow">Klausur {inDays(s.examIn)}</span>}
                <span className="block">
                  {s.open} {s.open === 1 ? 'To-do' : 'To-dos'}
                  {s.dueIn !== undefined && ` · nächste ${inDays(s.dueIn)}`}
                </span>
                {s.files > 0 && <span className="block">{s.files} {s.files === 1 ? 'Datei' : 'Dateien'}</span>}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-sys-line text-sys-muted active:bg-sys-line/30"
          >
            + Fach
          </button>
        </div>
        {archived.length > 0 && (
          <ul className="mt-4 divide-y divide-sys-line">
            {archived.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <span className="flex-1 text-sys-muted">{s.name}</span>
                <Button variant="ghost" onClick={() => updateSubject(s.id, { archived: false })}>
                  Zurückholen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Neues Fach">
        <div className="space-y-3">
          <TextField label="Name" value={name} onChange={setName} placeholder="z. B. Mathe 1" />
          <Button className="w-full" disabled={!name.trim()} onClick={add}>
            Anlegen
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
