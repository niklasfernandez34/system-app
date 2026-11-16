import { useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router'
import { runStartup } from './lib/startup'
import { SystemWatcher } from './components/SystemWatcher'
import { TodayPage } from './pages/TodayPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { MorePage } from './pages/MorePage'
import { JournalPage } from './pages/JournalPage'
import { HabitsPage } from './pages/HabitsPage'
import { NotesPage } from './pages/NotesPage'
import { SportPage } from './pages/SportPage'
import { PlanEditPage } from './pages/PlanEditPage'
import { WorkoutPage } from './pages/WorkoutPage'
import { BodyPage } from './pages/BodyPage'
import { PhotosPage } from './pages/PhotosPage'
import { StatusPage } from './pages/StatusPage'

const tabs = [
  { to: '/', label: 'Heute' },
  { to: '/sport', label: 'Sport' },
  { to: '/ernaehrung', label: 'Essen' },
  { to: '/uni', label: 'Uni' },
  { to: '/mehr', label: 'Mehr' },
]

export default function App() {
  useEffect(() => {
    runStartup()
    const onVisible = () => document.visibilityState === 'visible' && runStartup()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <main className="pt-safe px-safe flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl p-4">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/sport" element={<SportPage />} />
            <Route path="/sport/plan/:id" element={<PlanEditPage />} />
            <Route path="/sport/training" element={<WorkoutPage />} />
            <Route path="/sport/koerper" element={<BodyPage />} />
            <Route path="/sport/fotos" element={<PhotosPage />} />
            <Route path="/ernaehrung" element={<PlaceholderPage title="Ernährung" />} />
            <Route path="/uni" element={<PlaceholderPage title="Uni" />} />
            <Route path="/mehr" element={<MorePage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/tagebuch" element={<JournalPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/notizen" element={<NotesPage />} />
            <Route path="*" element={<PlaceholderPage title="Nicht gefunden" />} />
          </Routes>
        </div>
      </main>
      <nav className="pb-safe px-safe border-t border-sys-line bg-sys-panel/95">
        <ul className="mx-auto flex max-w-xl">
          {tabs.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) =>
                  `block py-3 text-center text-xs font-semibold uppercase tracking-widest ${
                    isActive ? 'text-sys-glow [text-shadow:0_0_8px_var(--color-sys-glow)]' : 'text-sys-muted'
                  }`
                }
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <SystemWatcher />
    </div>
  )
}
