import { addDays, format, parseISO } from 'date-fns'

const prevDay = (day: string) => format(addDays(parseISO(day), -1), 'yyyy-MM-dd')

export function calcStreak(days: Iterable<string>, today: string) {
  const set = new Set(days)
  let current = 0
  let d = set.has(today) ? today : prevDay(today)
  while (set.has(d)) {
    current++
    d = prevDay(d)
  }

  let longest = 0
  let run = 0
  let last = ''
  for (const day of [...set].filter((x) => x <= today).sort()) {
    run = last && prevDay(day) === last ? run + 1 : 1
    longest = Math.max(longest, run)
    last = day
  }
  return { current, longest }
}
