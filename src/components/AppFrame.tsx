import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation } from 'react-router'
import { currentDay } from '../lib/events'

export type Area = 'xp' | 'sport' | 'food' | 'uni' | 'skin' | 'will'

export function areaFor(path: string): Area {
  if (path.startsWith('/sport')) return 'sport'
  if (path.startsWith('/ernaehrung')) return 'food'
  if (path.startsWith('/uni')) return 'uni'
  if (path.startsWith('/haut')) return 'skin'
  if (['/habits', '/tagebuch', '/notizen'].some((p) => path.startsWith(p))) return 'will'
  return 'xp'
}

const TITLES: Record<string, string> = {
  '/': 'Heute',
  '/sport': 'Sport',
  '/sport/koerper': 'Körper',
  '/sport/fotos': 'Fotos',
  '/ernaehrung': 'Ernährung',
  '/ernaehrung/rezepte': 'Rezepte',
  '/ernaehrung/rechner': 'Rechner',
  '/uni': 'Uni',
  '/mehr': 'Mehr',
  '/status': 'Status',
  '/auswertung': 'Auswertung',
  '/kalender': 'Kalender',
  '/erfolge': 'Erfolge',
  '/tagebuch': 'Tagebuch',
  '/habits': 'Habits',
  '/notizen': 'Notizen',
  '/haut': 'Hautbild',
}

export function PageHeader() {
  const { pathname } = useLocation()
  const day = useLiveQuery(() => currentDay())
  const title = TITLES[pathname]
  if (!title) return null
  return (
    <header className="relative mb-4 px-1 pt-2">
      {pathname === '/' && day && (
        <p className="text-xs font-medium text-sys-muted">{format(parseISO(day), 'EEEE, d. MMMM', { locale: de })}</p>
      )}
      <h1 className="text-[22px] font-extrabold uppercase tracking-wide">{title}</h1>
    </header>
  )
}

const paths: Record<string, string> = {
  home: 'M12 3 3 10v11h6v-6h6v6h6V10z',
  sport: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  food: 'M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8',
  uni: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

export function TabIcon({ name }: { name: keyof typeof paths }) {
  const filled = name === 'home'
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={name === 'more' ? 3.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}
