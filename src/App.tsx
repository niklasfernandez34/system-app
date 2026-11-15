import { useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router'
import { runStartup } from './lib/startup'
import { TodayPage } from './pages/TodayPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { MorePage } from './pages/MorePage'

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
            <Route path="/sport" element={<PlaceholderPage title="Sport" />} />
            <Route path="/ernaehrung" element={<PlaceholderPage title="Ernährung" />} />
            <Route path="/uni" element={<PlaceholderPage title="Uni" />} />
            <Route path="/mehr" element={<MorePage />} />
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
                end
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
    </div>
  )
}
