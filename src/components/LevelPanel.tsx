import { useNavigate } from 'react-router'
import { ProgressBar } from './ui'
import { TITLES } from '../config/titles'
import { ATTRIBUTES, type Attribute } from '../config/xp'
import { useSetting } from '../db/settings'
import { roman } from '../lib/level'
import { useRankState } from '../lib/ranks'

const COLORS: Record<Attribute, string> = {
  str: 'text-sys-sport',
  int: 'text-sys-uni',
  vit: 'text-sys-food',
  cha: 'text-sys-skin',
  wil: 'text-sys-will',
}

export function LevelPanel() {
  const s = useRankState()
  const navigate = useNavigate()
  const titleId = useSetting('activeTitle')
  if (!s) return null
  const title = TITLES.find((t) => t.id === titleId)

  return (
    <button type="button" onClick={() => navigate('/status')} className="block w-full space-y-3 text-left">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#3b82f6] to-[#1e3a8a] text-[26px] font-extrabold italic">
          {s.rank}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">
            Rang {s.rank} · {roman(s.stage)}
          </p>
          {title ? (
            <p className="truncate text-xs font-medium text-sys-muted">„{title.name}“</p>
          ) : (
            <p className="text-xs font-medium text-sys-muted">Stufe {roman(s.stage)}</p>
          )}
        </div>
        <span className="text-lg font-semibold text-sys-muted">›</span>
      </div>
      <ProgressBar value={s.into} max={s.stageSize} label="XP" color="var(--color-sys-xp)" />
      {s.ready && !s.passed && (
        <p className="rounded-xl bg-sys-xp/10 px-3 py-2 text-center text-xs font-semibold text-sys-xp">
          Aufstiegsprüfung offen · Details ansehen
        </p>
      )}
      <ul className="grid grid-cols-5 gap-1 pt-1 text-center">
        {(Object.keys(ATTRIBUTES) as Attribute[]).map((a) => (
          <li key={a}>
            <p className={`text-base font-bold ${COLORS[a]}`}>{s.attributes[a]}</p>
            <p className="text-[10px] font-semibold uppercase text-sys-muted">{ATTRIBUTES[a].slice(0, 3)}</p>
          </li>
        ))}
      </ul>
    </button>
  )
}
