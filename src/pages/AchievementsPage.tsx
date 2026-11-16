import { ProgressBar, SystemWindow } from '../components/ui'
import { setSetting, useSetting } from '../db/settings'
import { useTitles } from '../lib/titleHooks'

export function AchievementsPage() {
  const titles = useTitles()
  const active = useSetting('activeTitle')
  if (!titles) return null

  const unlocked = titles.filter((t) => t.unlocked).length
  const categories = [...new Set(titles.map((t) => t.category))]

  return (
    <div className="space-y-4">
      <SystemWindow title="Erfolge">
        <ProgressBar value={unlocked} max={titles.length} label="Freigeschaltet" />
        <p className="mt-2 text-center text-xs text-sys-muted">Tippe einen freigeschalteten Titel an, um ihn zu tragen.</p>
      </SystemWindow>
      {categories.map((cat) => (
        <SystemWindow key={cat} title={cat}>
          <ul className="space-y-2">
            {titles
              .filter((t) => t.category === cat)
              .map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={!t.unlocked}
                    onClick={() => setSetting('activeTitle', active === t.id ? '' : t.id)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                      active === t.id
                        ? 'border-sys-glow bg-sys-glow/15 shadow-glow'
                        : t.unlocked
                          ? 'border-sys-line active:bg-sys-line/30'
                          : 'border-sys-line/40 opacity-50'
                    }`}
                  >
                    <span className="text-xl">{t.unlocked ? '🏅' : '🔒'}</span>
                    <span className="flex-1">
                      <span className={`block font-semibold ${t.unlocked ? 'text-sys-glow' : ''}`}>{t.name}</span>
                      <span className="block text-xs text-sys-muted">{t.hint}</span>
                    </span>
                    {active === t.id && <span className="text-xs text-sys-glow">Aktiv</span>}
                  </button>
                </li>
              ))}
          </ul>
        </SystemWindow>
      ))}
    </div>
  )
}
