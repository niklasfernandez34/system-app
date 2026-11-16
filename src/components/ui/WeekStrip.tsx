import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'

type Props = { marked?: readonly (number | Date)[]; today?: Date }

export function WeekStrip({ marked = [], today = new Date() }: Props) {
  const start = startOfWeek(today, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div>
      <p className="mb-2 text-sm font-bold">{format(today, 'MMMM yyyy', { locale: de })}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => {
          const on = isSameDay(d, today)
          const dot = marked.some((m) => isSameDay(m, d))
          return (
            <div key={d.toISOString()}>
              <p className="text-xs font-semibold text-sys-muted">{format(d, 'EEEEEE', { locale: de })}</p>
              <span
                className={`relative mx-auto mt-1.5 flex h-9 w-9 items-center justify-center text-sm font-bold ${
                  on ? 'rounded-xl bg-white text-black' : 'rounded-full bg-sys-raised'
                }`}
              >
                {format(d, 'd')}
                {dot && <i className="absolute -bottom-2 h-1.5 w-1.5 rounded-full bg-sys-glow" />}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
