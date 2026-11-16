import { SystemWindow } from './ui'
import { toggleTodo, useDueTodos } from '../lib/uni'

const dueLabel = (d: number) =>
  d > 1 ? `in ${d} Tagen` : d === 1 ? 'morgen' : d === 0 ? 'heute' : d === -1 ? 'seit gestern' : `seit ${-d} Tagen`

export function Deadlines({ compact = false }: { compact?: boolean }) {
  const due = useDueTodos(compact ? 3 : 14)
  if (!due?.length) return null
  return (
    <SystemWindow title="Fristen">
      <ul className="space-y-2">
        {due.map((t) => (
          <li key={t.id} className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Erledigt"
              onClick={() => toggleTodo(t.id)}
              className="h-6 w-6 shrink-0 rounded border border-sys-line"
            />
            <span className="flex-1 text-sm">
              {t.text}
              <span className="block text-xs text-sys-muted">{t.subject}</span>
            </span>
            <span className={`shrink-0 text-sm ${t.daysLeft <= 1 ? 'text-sys-danger' : 'text-sys-glow'}`}>{dueLabel(t.daysLeft)}</span>
          </li>
        ))}
      </ul>
    </SystemWindow>
  )
}
