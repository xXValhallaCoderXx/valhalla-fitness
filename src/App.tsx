import { useEffect } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { Glyph } from '@/components/ui'
import { useStore } from '@/state/store'
import { Today } from '@/routes/Today'
import { Onboarding } from '@/routes/Onboarding'
import { Settings } from '@/routes/Settings'
import { ProgressScreen } from '@/routes/Progress'
import { Accessories } from '@/routes/Accessories'
import { Mobility } from '@/routes/Mobility'
import { Plan } from '@/routes/Plan'

const TABS = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/plan', label: 'Plan', icon: 'plan' },
  { to: '/progress', label: 'Progress', icon: 'chart' },
  { to: '/accessories', label: 'Gear', icon: 'blocks' },
  { to: '/mobility', label: 'Mobility', icon: 'mobility' },
] as const

function Splash() {
  return <div className="flex min-h-full items-center justify-center text-slate-400">Loading...</div>
}

function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-xs ${
              isActive ? 'text-indigo-300' : 'text-slate-400'
            }`
          }
        >
          <Glyph name={tab.icon} className="h-5 w-5" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

function Shell() {
  const onboarded = useStore((s) => s.state?.onboarded)
  if (!onboarded) return <Navigate to="/welcome" replace />
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-24 pt-5">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}

export function App() {
  const status = useStore((s) => s.status)
  const init = useStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  if (status === 'loading') return <Splash />

  return (
    <Routes>
      <Route path="/welcome" element={<Onboarding />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Today />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/accessories" element={<Accessories />} />
        <Route path="/mobility" element={<Mobility />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
