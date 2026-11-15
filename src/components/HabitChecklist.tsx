import { toggleHabit, useHabits } from '../lib/habits'

export function HabitChecklist() {
  const habits = useHabits()?.filter((h) => !h.archived)

  if (!habits) return null
  if (!habits.length) return <p className="text-center text-sys-muted">Noch keine Habits angelegt.</p>

  return (
    <ul className="space-y-2">
      {habits.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            onClick={() => toggleHabit(h.id)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-md border px-3 text-left transition-colors ${
              h.done ? 'border-sys-glow bg-sys-glow/15 shadow-glow' : 'border-sys-line active:bg-sys-line/30'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
                h.done ? 'border-sys-glow bg-sys-glow text-sys-bg' : 'border-sys-muted'
              }`}
            >
              {h.done ? '✓' : ''}
            </span>
            <span className={`flex-1 ${h.done ? 'text-sys-text' : 'text-sys-muted'}`}>{h.name}</span>
            <span className="text-xs text-sys-glow">{h.current > 0 ? `${h.current} 🔥` : ''}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
