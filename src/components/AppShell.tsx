import { Box, Button } from '@mantine/core'
import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarDays, History, Layers3, ListChecks, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandMark, Text } from '~/components/atoms'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { cn } from '~/shared/lib/cn'

const navItems = [
  { to: '/today', label: 'Today', icon: CalendarDays },
  { to: '/program', label: 'Your Plan', icon: ListChecks },
  { to: '/history', label: 'Insights', icon: History },
  { to: '/templates', label: 'Plans', icon: Layers3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function AppShell({ children }: { user: AuthUser | null; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isNavigating = useRouterState({ select: (state) => state.isLoading })
  const isChromeless = pathname === '/' || pathname.startsWith('/auth')

  if (isChromeless) return <>{children}</>

  return (
    <Box
      bg="var(--mantine-color-body)"
      c="var(--mantine-color-text)"
      className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
    >
      <Box
        component="header"
        className="sticky top-[env(safe-area-inset-top)] z-30 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 94%, transparent)',
        }}
      >
        <div className="mx-auto grid h-12 max-w-[1180px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 md:px-5">
          <Link to="/today" className="flex min-w-0 items-center gap-2 justify-self-start">
            <BrandMark size="sm" />
            <Text component="span" size="sm" fw={900} truncate>
              Sheetless
            </Text>
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
          <div aria-hidden="true" />
        </div>
        <NavigationProgress active={isNavigating} />
      </Box>
      {children}
      <Box
        component="nav"
        className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 96%, transparent)',
          boxShadow: '0 -12px 36px rgb(0 0 0 / 0.12)',
        }}
      >
        <div className="grid h-16 grid-cols-5">
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
