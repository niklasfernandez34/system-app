import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router'
import { PageHeader, TabIcon, areaFor } from './components/AppFrame'
import { runStartup } from './lib/startup'
import { SystemWatcher } from './components/SystemWatcher'
import { TodayPage } from './pages/TodayPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { StatsPage } from './pages/StatsPage'
import { CalendarPage } from './pages/CalendarPage'
import { NutritionPage } from './pages/NutritionPage'
import { RecipeEditPage } from './pages/RecipeEditPage'
import { RecipesPage } from './pages/RecipesPage'
import { CalculatorPage } from './pages/CalculatorPage'
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
import { AchievementsPage } from './pages/AchievementsPage'
import { UniPage } from './pages/UniPage'
import { SubjectPage } from './pages/SubjectPage'
import { SkinPage } from './pages/SkinPage'
import { StudyTimerFloat } from './components/StudyTimer'
import { SyncWatcher } from './components/SyncWatcher'
import { SystemWindow } from './components/ui'
import { isConnected, syncOnOpen } from './lib/sync'

const tabs = [
  { to: '/', label: 'Heute', icon: 'home' },
  { to: '/sport', label: 'Sport', icon: 'sport' },
  { to: '/ernaehrung', label: 'Essen', icon: 'food' },
  { to: '/uni', label: 'Uni', icon: 'uni' },
  { to: '/mehr', label: 'Mehr', icon: 'more' },
] as const

export default function App() {
  const [ready, setReady] = useState(() => !isConnected())
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.dataset.area = areaFor(pathname)
  }, [pathname])

  useEffect(() => {
    if (ready) return
    syncOnOpen().finally(() => setReady(true))
  }, [ready])

  useEffect(() => {
    if (!ready) return
    runStartup()
    const onVisible = () => document.visibilityState === 'visible' && syncOnOpen().finally(runStartup)
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [ready])

  if (!ready)
    return (
      <div className="pt-safe flex h-full items-center justify-center p-6">
        <SystemWindow>
          <p className="animate-pulse text-center font-semibold">Synchronisiere mit Dropbox …</p>
        </SystemWindow>
      </div>
    )

  return (
    <div className="relative flex h-full flex-col">
      <div className="area-glow" />
      <main className="pt-safe px-safe relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-4 pt-3 pb-32">
          <PageHeader />
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/sport" element={<SportPage />} />
            <Route path="/sport/plan/:id" element={<PlanEditPage />} />
            <Route path="/sport/training" element={<WorkoutPage />} />
            <Route path="/sport/koerper" element={<BodyPage />} />
            <Route path="/sport/fotos" element={<PhotosPage />} />
            <Route path="/ernaehrung" element={<NutritionPage />} />
            <Route path="/ernaehrung/rezepte" element={<RecipesPage />} />
            <Route path="/ernaehrung/rechner" element={<CalculatorPage />} />
            <Route path="/ernaehrung/rezept/:id" element={<RecipeEditPage />} />
            <Route path="/uni" element={<UniPage />} />
            <Route path="/uni/fach/:id" element={<SubjectPage />} />
            <Route path="/mehr" element={<MorePage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/auswertung" element={<StatsPage />} />
            <Route path="/kalender" element={<CalendarPage />} />
            <Route path="/erfolge" element={<AchievementsPage />} />
            <Route path="/tagebuch" element={<JournalPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/notizen" element={<NotesPage />} />
            <Route path="/haut" element={<SkinPage />} />
            <Route path="*" element={<PlaceholderPage title="Nicht gefunden" />} />
          </Routes>
        </div>
      </main>
      <div className="pb-safe px-safe pointer-events-none fixed inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto">
          <StudyTimerFloat />
        </div>
        <nav className="pointer-events-auto mx-auto mb-3 w-[calc(100%-1.75rem)] max-w-xl rounded-3xl border border-white/8 bg-[#1e1e22]/85 shadow-card backdrop-blur-xl">
          <ul className="flex">
            {tabs.map((t) => (
              <li key={t.to} className="flex-1">
                <NavLink
                  to={t.to}
                  end={t.to === '/'}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 py-2.5 text-[9.5px] font-bold uppercase tracking-wider ${
                      isActive ? 'text-white' : 'text-[#77777f]'
                    }`
                  }
                >
                  <TabIcon name={t.icon} />
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <SystemWatcher />
      <SyncWatcher />
    </div>
  )
}
