import { ProgressBar, SystemWindow } from '../components/ui'
import { ATTRIBUTES, RANKS, type Attribute } from '../config/xp'
import { roman } from '../lib/level'
import { useRankState } from '../lib/ranks'
import { fmt } from '../lib/sport'

export function StatusPage() {
  const s = useRankState()
  if (!s) return null
  const next = RANKS[s.rankIndex + 1]?.rank

  return (
    <div className="space-y-4">
      <SystemWindow title="Status">
        <p className="text-center text-5xl font-bold text-sys-glow [text-shadow:0_0_16px_var(--color-sys-glow)]">
          {s.rank} · {roman(s.stage)}
        </p>
        <p className="mb-3 mt-1 text-center text-sm text-sys-muted">Gesamt {fmt(s.xp)} XP</p>
        <ProgressBar value={s.into} max={s.stageSize} label="XP in dieser Stufe" />
      </SystemWindow>

      <SystemWindow title="Attribute">
        <ul className="space-y-1">
          {(Object.keys(ATTRIBUTES) as Attribute[]).map((a) => (
            <li key={a} className="flex justify-between">
              <span className="text-sys-muted">{ATTRIBUTES[a]}</span>
              <span className="font-semibold">{s.attributes[a]}</span>
            </li>
          ))}
        </ul>
      </SystemWindow>

      {next && (
        <SystemWindow title={`Aufstiegsprüfung ${s.rank} → ${next}`}>
          <p className="mb-3 text-center text-sm text-sys-muted">
            {s.ready ? '✓ Stufe V ist voll.' : 'Erst Stufe V füllen.'} Dazu alle 5 Bedingungen erfüllen.
          </p>
          <ul className="space-y-4">
            {s.conditions.map((c, i) => (
              <li key={i}>
                <p className={`flex justify-between gap-2 font-semibold ${c.passed ? 'text-sys-glow' : ''}`}>
                  <span>{c.label}</span>
                  <span>{c.passed ? '✓' : ''}</span>
                </p>
                <p className="mb-1 text-xs text-sys-muted">{c.detail}</p>
                <ProgressBar value={Math.round(c.value * 100) / 100} max={c.target} />
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}
    </div>
  )
}
