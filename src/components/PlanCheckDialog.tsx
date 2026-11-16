import { Button, Dialog } from './ui'
import type { PlanCheck } from '../lib/calorieCalc'
import { fmtNum } from '../lib/nutrition'
import { acceptCheck, declineCheck } from '../lib/nutritionPlan'

const rateText = (r: number) =>
  Math.abs(r) < 0.05 ? 'hältst du dein Gewicht' : `nimmst du ${(Math.round(Math.abs(r) * 10) / 10).toLocaleString('de-DE')} kg/Woche ${r < 0 ? 'ab' : 'zu'}`
const planText = (r: number) =>
  r === 0 ? 'Gewicht halten' : `${(Math.round(Math.abs(r) * 100) / 100).toLocaleString('de-DE')} kg/Woche ${r < 0 ? 'abnehmen' : 'zunehmen'}`

export function PlanCheckDialog({ check, currentKcal, onClose }: { check: PlanCheck | null; currentKcal: number; onClose: () => void }) {
  return (
    <Dialog open={!!check} onClose={onClose} title="Kalorien anpassen?">
      {check && (
        <div className="space-y-3">
          <p>
            Seit der letzten Berechnung {rateText(check.actualRate)}. Geplant: {planText(check.plannedRate)}.
          </p>
          <p className="text-sm text-sys-muted">
            Du hast im Schnitt {fmtNum(check.avgIntake)} kcal gegessen. Dein echter Umsatz liegt damit bei etwa{' '}
            {fmtNum(check.newTdee)} kcal.
          </p>
          <div className="rounded-md border border-sys-glow/40 p-3 text-center">
            <div className="text-sm text-sys-muted line-through">{fmtNum(currentKcal)} kcal</div>
            <div className="text-2xl font-bold text-sys-glow">{fmtNum(check.goals.kcal)} kcal</div>
            <div className="text-sm text-sys-muted">
              Eiweiß {check.goals.protein} g · Kohlenh. {check.goals.carbs} g · Fett {check.goals.fat} g
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={async () => {
                await declineCheck()
                onClose()
              }}
            >
              Nein
            </Button>
            <Button
              onClick={async () => {
                await acceptCheck(check)
                onClose()
              }}
            >
              Übernehmen
            </Button>
          </div>
          <p className="text-center text-xs text-sys-muted">Bei „Nein“ wird in 2 Wochen wieder geprüft.</p>
        </div>
      )}
    </Dialog>
  )
}
