import { XP } from '../config/xp'
import { togglePenalty, useQuests } from '../lib/quests'

const box = (done: boolean, danger = false) =>
  `flex h-6 w-6 shrink-0 items-center justify-center rounded-2xl border-2 text-xs font-extrabold ${
    done ? (danger ? 'border-sys-danger bg-sys-danger text-black' : 'border-sys-ok bg-sys-ok text-black') : 'border-[#3a3a41]'
  }`

export function QuestList() {
  const data = useQuests()
  if (!data) return null
  const { quests, penalty } = data
  const doneCount = quests.filter((q) => q.done).length

  return (
    <div className="space-y-3">
      {penalty && (
        <button
          type="button"
          onClick={togglePenalty}
          className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border border-sys-danger/60 px-3 py-2 text-left ${
            penalty.done ? 'bg-sys-danger/15' : 'active:bg-sys-danger/20'
          }`}
        >
          <span className={box(penalty.done, true)}>{penalty.done ? '✓' : ''}</span>
          <span className="flex-1">
            <span className="block text-xs font-semibold uppercase tracking-widest text-sys-danger">Penalty Quest</span>
            {penalty.title}
          </span>
          <span className="text-xs text-sys-danger">+{penalty.failed * -XP.quest_failed} XP</span>
        </button>
      )}
      <ul className="divide-y divide-sys-line">
        {quests.map((q) => (
          <li key={q.id} className="flex min-h-12 items-center gap-3 px-1 text-sm font-semibold">
            <span className={box(q.done)}>{q.done ? '✓' : ''}</span>
            <span className={`flex-1 ${q.done ? 'text-sys-text' : 'text-sys-muted'}`}>{q.title}</span>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-sys-muted">
        {doneCount} / {quests.length} erledigt · Bonus +{XP.quests_completed} XP · Verpasst: {XP.quest_failed} XP pro
        Quest
      </p>
    </div>
  )
}
