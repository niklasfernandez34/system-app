import { addDays, differenceInCalendarDays, format, parseISO, subHours } from 'date-fns'

export function logicalDay(date: Date, dayStartHour: number): string {
  return format(subHours(date, dayStartHour), 'yyyy-MM-dd')
}

export function daysBetween(fromDay: string, toDay: string): string[] {
  if (!fromDay) return []
  const from = parseISO(fromDay)
  const n = differenceInCalendarDays(parseISO(toDay), from)
  return Array.from({ length: Math.max(0, n - 1) }, (_, i) => format(addDays(from, i + 1), 'yyyy-MM-dd'))
}
