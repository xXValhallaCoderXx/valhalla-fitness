import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarDays, CheckCircle2, Dumbbell, History, Layers3, ListChecks, Settings, UserCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AuthUser } from '~/domains/account/server/auth'
import { cn } from '~/shared/lib/cn'

const navItems = [
  { to: '/today', label: 'Today', icon: CalendarDays },
  { to: '/program', label: 'Program', icon: ListChecks },
  { to: '/history', label: 'History', icon: History },
  { to: '/templates', label: 'Templates', icon: Layers3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function AppShell({ user, children }: { user: AuthUser | null; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isNavigating = useRouterState({ select: (state) => state.isLoading })
  const isAuth = pathname.startsWith('/auth')

  if (isAuth) return <>{children}</>

  return (
    <div className="min-h-dvh bg-[var(--mantine-color-body)] pb-[calc(4rem+env(safe-area-inset-bottom))] text-[var(--mantine-color-text)] md:pb-0">
      <header className="sticky top-[env(safe-area-inset-top)] z-30 border-b border-[var(--mantine-color-default-border)] bg-[color:var(--mantine-color-default)/0.94] backdrop-blur-md">
        <div className="mx-auto grid h-12 max-w-[1180px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 md:px-5">
          <Link to="/today" className="flex min-w-0 items-center gap-2 justify-self-start">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--vf-brand-mark)] text-[var(--vf-brand-mark-text)]">
              <Dumbbell size={14} />
            </span>
            <span className="truncate text-sm font-extrabold">Sheetless</span>
          </Link>
          <nav className="hidden items-center justify-center gap-1 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-1 text-xs font-semibold shadow-[var(--vf-shadow-card)] md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[var(--mantine-color-dimmed)] transition hover:bg-[var(--mantine-color-default)] hover:text-[var(--mantine-color-text)]',
                  pathname.startsWith(item.to) && 'bg-[var(--mantine-color-default)] text-[var(--vf-action-text)] shadow-[var(--vf-shadow-card)]',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex min-w-0 items-center justify-end gap-2 text-xs text-[var(--mantine-color-dimmed)]">
            <span className="hidden items-center gap-1.5 rounded-md border border-[var(--vf-success-border)] bg-[var(--vf-success-soft)] px-2 py-1 font-bold text-[var(--vf-success-text)] sm:flex">
              <CheckCircle2 size={12} />
              Synced
            </span>
            <span className="flex min-w-0 items-center gap-1.5 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-2 py-1">
              <UserCircle size={16} />
              <span className="hidden max-w-44 truncate lg:inline">{user?.email ?? 'Guest'}</span>
            </span>
          </div>
        </div>
        <NavigationProgress active={isNavigating} />
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--mantine-color-default-border)] bg-[color:var(--mantine-color-default)/0.96] px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_36px_rgb(0_0_0/0.12)] backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md text-[9px] font-bold',
                  active ? 'text-[var(--vf-action-text)]' : 'text-[var(--mantine-color-dimmed)]',
                )}
                aria-label={item.label}
              >
                {active ? <span className="absolute top-1 h-0.5 w-6 rounded-b-full bg-[var(--mantine-primary-color-filled)]" /> : null}
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

function NavigationProgress({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden opacity-0 transition-opacity duration-150',
        active && 'opacity-100',
      )}
    >
      <span
        className={cn(
          'block h-full w-1/3 rounded-full bg-[var(--mantine-primary-color-filled)]',
          active && 'vf-route-progress',
        )}
      />
    </span>
  )
}
