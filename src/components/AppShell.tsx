import { Box, Button } from '@mantine/core'
import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarDays, History, Layers3, ListChecks } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandLockup, Text } from '~/components/atoms'
import { UserMenu } from '~/domains/account/components'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { cn } from '~/shared/lib/cn'

const navItems = [
  { to: '/today', label: 'Today', icon: CalendarDays },
  { to: '/program', label: 'Plan', icon: ListChecks },
  { to: '/history', label: 'Insights', icon: History },
  { to: '/templates', label: 'Programs', icon: Layers3 },
] as const

export function AppShell({ user, children }: { user: AuthUser | null; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isNavigating = useRouterState({ select: (state) => state.isLoading })
  const isChromeless = pathname === '/' || pathname.startsWith('/auth')

  // The app shell is a fixed-height flex column with an internal scroll area, so the document
  // itself never scrolls. This keeps the mobile address bar from collapsing/expanding (which
  // otherwise shifts the fixed nav + dvh content between pages).
  if (isChromeless) return <>{children}</>

  return (
    <Box
      bg="var(--mantine-color-body)"
      c="var(--mantine-color-text)"
      className="flex h-dvh flex-col overflow-hidden"
    >
      <Box
        component="header"
        className="relative z-30 shrink-0 pt-[env(safe-area-inset-top)] backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 94%, transparent)',
        }}
      >
        <div className="mx-auto grid h-12 max-w-[1180px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 md:px-5">
          <Link to="/today" className="flex min-w-0 items-center justify-self-start">
            <BrandLockup size="sm" />
          </Link>
          <Box
            component="nav"
            className="hidden items-center justify-center gap-1 rounded-lg p-1 md:flex"
            bg="var(--vf-surface-2)"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              boxShadow: 'var(--vf-shadow-card)',
            }}
          >
            {navItems.map((item) => {
              const active = pathname.startsWith(item.to)
              return (
                <Button
                  key={item.to}
                  component={Link}
                  to={item.to}
                  data-tour={`nav-${item.to.slice(1)}`}
                  color={active ? 'action' : 'neutral'}
                  variant={active ? 'light' : 'subtle'}
                  size="compact-xs"
                >
                  {item.label}
                </Button>
              )
            })}
          </Box>
          {/* col-start-3 pins the avatar to the right column even on mobile, where the
              display:none desktop nav drops out of the grid flow. */}
          <div className="col-start-3 flex items-center justify-self-end">
            {user ? <UserMenu user={user} /> : null}
          </div>
        </div>
        <NavigationProgress active={isNavigating} />
      </Box>
      {/* key by pathname so each route mounts a fresh scroll area (starts at the top). */}
      <div key={pathname} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: 'stable' }}>
        {children}
      </div>
      <Box
        component="nav"
        className="z-40 shrink-0 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 96%, transparent)',
          boxShadow: '0 -12px 36px rgb(0 0 0 / 0.12)',
        }}
      >
        <div className="grid h-16 grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour={`mnav-${item.to.slice(1)}`}
                className="relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md"
                style={{ color: active ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)' }}
                aria-label={item.label}
              >
                {active ? (
                  <Box
                    component="span"
                    bg="var(--mantine-primary-color-filled)"
                    className="absolute top-1 h-0.5 w-6 rounded-b-full"
                  />
                ) : null}
                <Icon size={18} />
                <Text component="span" size="0.5625rem" fw={800} c="inherit" truncate>
                  {item.label}
                </Text>
              </Link>
            )
          })}
        </div>
      </Box>
    </Box>
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
      <Box
        component="span"
        bg="var(--mantine-primary-color-filled)"
        className={cn(
          'block h-full w-1/3 rounded-full',
          active && 'vf-route-progress',
        )}
      />
    </span>
  )
}
