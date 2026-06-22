import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarDays, Dumbbell, History, Layers3, ListChecks, Settings, UserCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AuthUser } from '~/server/auth'
import { cn } from '~/lib/cn'

const navItems = [
  { to: '/today', label: 'Today', icon: CalendarDays },
  { to: '/program', label: 'Program', icon: ListChecks },
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
        <div className="mx-auto flex h-12 max-w-[920px] items-center justify-between px-4 md:px-5">
          <Link to="/today" className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--brand-mark)] text-[var(--brand-mark-text)]">
              <Dumbbell size={12} />
            </span>
            <span className="text-sm font-extrabold tracking-tight">Valhalla Fitness</span>
          </Link>
          <nav className="hidden items-center gap-5 text-xs font-semibold md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'relative py-4 text-[var(--muted)] transition hover:text-[var(--text)]',
                  pathname.startsWith(item.to) && 'text-[var(--action)]',
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
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-semibold sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
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
                  'relative flex min-w-0 flex-col items-center justify-center gap-0.5 text-[9px] font-semibold',
                  active ? 'text-[var(--action)]' : 'text-[var(--muted)]',
                )}
                aria-label={item.label}
              >
                {active ? <span className="absolute top-0 h-0.5 w-6 rounded-b-full bg-[var(--action)]" /> : null}
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
