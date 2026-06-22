import { useEffect, useState, type ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider, useQuery, type QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { fetchUserFn, type AuthUser } from '~/server/auth'
import { getMeFn } from '~/server/api'
import { meQueryOptions } from '~/lib/query-options'
import type { ThemePreference, UserProfile } from '~/types/training'
import { AppShell } from '~/components/AppShell'
import { mantineTheme } from '~/styles/mantine-theme'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => {
    const user = await fetchUserFn()
    const me = user ? await getMeFn().catch(() => null) : null
    return { user, me }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        title: 'Valhalla Fitness',
      },
      {
        name: 'description',
        content: 'Structured strength training tracker for planned progression.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { queryClient, user, me } = Route.useRouteContext() as {
    queryClient: QueryClient
    user: AuthUser | null
    me: UserProfile | null
  }
  const initialTheme = resolveInitialTheme(me?.themePreference ?? 'system')

  return (
    <html lang="en" data-theme={initialTheme}>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemedAppShell user={user} initialMe={me}>
            {children}
          </ThemedAppShell>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}

function ThemedAppShell({
  children,
  initialMe,
  user,
}: Readonly<{ children: ReactNode; initialMe: UserProfile | null; user: AuthUser | null }>) {
  const [previewThemePreference, setPreviewThemePreference] = useState<ThemePreference | null>(null)
  const { data: me } = useQuery({
    ...meQueryOptions(),
    enabled: Boolean(user),
    initialData: initialMe ?? undefined,
  })
  const resolvedTheme = useResolvedTheme(previewThemePreference ?? me?.themePreference ?? 'system')

  useEffect(() => {
    const handlePreview = (event: Event) => {
      const preference = (event as CustomEvent<ThemePreference>).detail
      setPreviewThemePreference(preference)
    }
    const handlePreviewClear = () => setPreviewThemePreference(null)
    window.addEventListener('valhalla-theme-preview', handlePreview)
    window.addEventListener('valhalla-theme-preview-clear', handlePreviewClear)
    return () => {
      window.removeEventListener('valhalla-theme-preview', handlePreview)
      window.removeEventListener('valhalla-theme-preview-clear', handlePreviewClear)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme={resolvedTheme} forceColorScheme={resolvedTheme}>
      <AppShell user={user}>{children}</AppShell>
      <Notifications position="top-right" limit={4} />
      <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
      <TanStackRouterDevtools position="bottom-right" />
    </MantineProvider>
  )
}

function useResolvedTheme(preference: ThemePreference) {
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const updateSystemTheme = () => setSystemTheme(mediaQuery.matches ? 'light' : 'dark')
    updateSystemTheme()
    mediaQuery.addEventListener('change', updateSystemTheme)
    return () => mediaQuery.removeEventListener('change', updateSystemTheme)
  }, [])

  return preference === 'system' ? systemTheme : preference
}

function resolveInitialTheme(preference: ThemePreference) {
  return preference === 'light' ? 'light' : 'dark'
}
