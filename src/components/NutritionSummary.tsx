import { ProgressBar, Ring } from './ui'
import type { Macros } from '../db/db'
import type { Goals } from '../lib/nutrition'

type Props = { totals: Macros; goals: Goals; compact?: boolean }

const de = (n: number) => Math.round(n).toLocaleString('de-DE')

export function NutritionSummary({ totals, goals, compact }: Props) {
  const r = Math.round
  return (
    <div className="flex items-center gap-4">
      <Ring value={totals.kcal} max={goals.kcal} size={compact ? 96 : 112} color="var(--color-sys-food)">
        <span className="text-lg font-extrabold">{de(totals.kcal)}</span>
        <span className="text-[11px] font-medium text-sys-muted">/ {de(goals.kcal)} kcal</span>
      </Ring>
      <div className="min-w-0 flex-1 space-y-2.5">
        <ProgressBar label="Eiweiß (g)" value={r(totals.protein)} max={goals.protein} color="var(--color-sys-protein)" />
        {!compact && (
          <>
            <ProgressBar label="Kohlenh. (g)" value={r(totals.carbs)} max={goals.carbs} color="var(--color-sys-carbs)" />
            <ProgressBar label="Fett (g)" value={r(totals.fat)} max={goals.fat} color="var(--color-sys-fat)" />
          </>
        )}
      </div>
    </div>
  )
}
