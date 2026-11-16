import { useNavigate } from 'react-router'
import { ProgressBar } from './ui'
import { ATTRIBUTES, type Attribute } from '../config/xp'
import { roman } from '../lib/level'
import { useRankState } from '../lib/ranks'

export function LevelPanel() {
  const s = useRankState()
  const navigate = useNavigate()
  if (!s) return null

  return (
    <button type="button" onClick={() => navigate('/status')} className="block w-full space-y-3 text-left">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-sys-muted">Rang</p>
          <p className="text-4xl font-bold text-sys-glow [text-shadow:0_0_12px_var(--color-sys-glow)]">{s.rank}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-sys-muted">Stufe</p>
          <p className="text-4xl font-bold">{roman(s.stage)}</p>
        </div>
      </div>
      <ProgressBar value={s.into} max={s.stageSize} label="XP" />
      {s.ready && !s.passed && (
        <p className="text-center text-sm text-sys-glow">Aufstiegsprüfung offen · Details ansehen</p>
      )}
      <ul className="grid grid-cols-5 gap-1 text-center">
        {(Object.keys(ATTRIBUTES) as Attribute[]).map((a) => (
          <li key={a} className="rounded border border-sys-line py-1">
            <p className="text-[10px] uppercase text-sys-muted">{ATTRIBUTES[a].slice(0, 3)}</p>
            <p className="font-semibold">{s.attributes[a]}</p>
          </li>
        ))}
      </ul>
    </button>
  )
}
