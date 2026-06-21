import { Link, useRouterState } from '@tanstack/react-router'
import {
  CalendarDays,
  Dumbbell,
  History,
  Layers3,
  Settings,
  UserCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { AuthUser } from '~/server/auth'
import { cn } from '~/lib/cn'

const navItems = [
  { to: '/today', label: 'Today', icon: CalendarDays },
  { to: '/program', label: 'Program', icon: Dumbbell },
  { to: '/history', label: 'History', icon: History },
  { to: '/templates', label: 'Templates', icon: Layers3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function AppShell({ user, children }: { user: AuthUser | null; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuth = pathname.startsWith('/auth')

  if (isAuth) return <>{children}</>

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 text-[var(--text)] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color:var(--surface)/0.96] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/today" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--action)] text-white">
              <Dumbbell size={16} />
            </span>
            <span className="text-sm font-bold tracking-tight">Mobile Strength Tracker</span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'relative py-5 text-xs font-semibold text-[var(--muted)]',
                  pathname.startsWith(item.to) && 'text-[var(--text)]',
                )}
              >
                {item.label}
                {pathname.startsWith(item.to) ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded bg-[var(--action)]" />
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span className="hidden rounded-full border border-[var(--border)] px-2 py-1 sm:inline">
              Synced
            </span>
            <UserCircle size={24} />
            <span className="hidden max-w-40 truncate md:inline">{user?.email ?? 'Guest'}</span>
          </div>
        </div>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid h-16 grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 text-[9px] font-semibold',
                  active ? 'text-[var(--action)]' : 'text-[var(--muted)]',
                )}
                aria-label={item.label}
              >
                <Icon size={18} />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
