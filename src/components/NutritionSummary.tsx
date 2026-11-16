import { ProgressBar } from './ui'
import type { Macros } from '../db/db'
import type { Goals } from '../lib/nutrition'

type Props = { totals: Macros; goals: Goals; compact?: boolean }

export function NutritionSummary({ totals, goals, compact }: Props) {
  const r = Math.round
  return (
    <div className="space-y-3">
      <ProgressBar label="Kalorien (kcal)" value={r(totals.kcal)} max={goals.kcal} />
      <div className="rounded-md border border-sys-glow/40 p-2">
        <ProgressBar label="Eiweiß (g)" value={r(totals.protein)} max={goals.protein} />
      </div>
      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <ProgressBar label="Kohlenh. (g)" value={r(totals.carbs)} max={goals.carbs} />
          <ProgressBar label="Fett (g)" value={r(totals.fat)} max={goals.fat} />
        </div>
      )}
    </div>
  )
}
