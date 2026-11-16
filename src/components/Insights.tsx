import { format, parseISO, subDays } from 'date-fns'
import { SystemWindow } from './ui'
import { useStatsData } from '../lib/statsData'
import { INSIGHT_DAYS, MIN_DAYS, insights } from '../lib/insights'

const from = (today: string) => format(subDays(parseISO(today), INSIGHT_DAYS + 7), 'yyyy-MM-dd')

const lastDays = (today: string) =>
  Array.from({ length: INSIGHT_DAYS }, (_, i) => format(subDays(parseISO(today), INSIGHT_DAYS - 1 - i), 'yyyy-MM-dd'))

const num = (n: number, digits: number) => n.toLocaleString('de-DE', { maximumFractionDigits: digits })

export function Insights() {
  const data = useStatsData(from)
  if (!data) return null
  const { found, waiting } = insights(data.daily, lastDays(data.today))
  return (
    <SystemWindow title="Zusammenhänge">
      {found.length === 0 ? (
        <p className="text-center text-sm text-sys-muted">
          Noch keine klaren Zusammenhänge. Das System braucht für jeden Vergleich mindestens {MIN_DAYS} Tage pro Seite, also z. B. 5 Tage mit
          und 5 ohne 7 h Schlaf.
        </p>
      ) : (
        <div className="divide-y divide-sys-line">
          {found.map(({ rule, a, b, nA, nB, diff }) => (
            <div key={rule.id} className="py-2">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  {rule.when}: <span className="font-semibold">{rule.what}</span>
                </span>
                <span className={`shrink-0 font-semibold ${diff > 0 ? 'text-sys-ok' : 'text-sys-danger'}`}>
                  {diff > 0 ? '+' : '−'}
                  {num(Math.abs(diff), 0)} %
                </span>
              </div>
              <p className="text-xs text-sys-muted">
                Ø {num(a, rule.digits)} {rule.unit} statt {num(b, rule.digits)} {rule.unit} bei {rule.other} · {nA} / {nB} Tage
              </p>
            </div>
          ))}
        </div>
      )}
      {found.length > 0 && waiting > 0 && (
        <p className="mt-2 text-center text-xs text-sys-muted">{waiting} weitere Vergleiche warten noch auf genug Tage.</p>
      )}
      <p className="mt-2 text-center text-xs text-sys-muted">Letzte {INSIGHT_DAYS} Tage. Ein Zusammenhang heißt nicht, dass das eine das andere verursacht.</p>
    </SystemWindow>
  )
}
