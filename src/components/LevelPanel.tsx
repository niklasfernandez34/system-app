import { ProgressBar } from './ui'
import { ATTRIBUTES, type Attribute } from '../config/xp'
import { useLevel } from '../lib/levelHooks'

export function LevelPanel() {
  const level = useLevel()
  if (!level) return null

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-sys-muted">Level</p>
          <p className="text-4xl font-bold text-sys-glow [text-shadow:0_0_12px_var(--color-sys-glow)]">
            {level.level}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-sys-muted">Rang</p>
          <p className="text-4xl font-bold">{level.rank}</p>
        </div>
      </div>
      <ProgressBar value={level.into} max={level.need} label="XP" />
      <ul className="grid grid-cols-5 gap-1 text-center">
        {(Object.keys(ATTRIBUTES) as Attribute[]).map((a) => (
          <li key={a} className="rounded border border-sys-line py-1">
            <p className="text-[10px] uppercase text-sys-muted">{ATTRIBUTES[a].slice(0, 3)}</p>
            <p className="font-semibold">{level.attributes[a]}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
