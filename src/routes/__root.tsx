import { useEffect, useState, type ReactNode } from 'react'
import { ColorSchemeScript, MantineProvider, type MantineColorSchemeManager } from '@mantine/core'
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
import { PwaUpdatePrompt } from '~/components/PwaUpdatePrompt'
import { mantineCssVariablesResolver, mantineTheme } from '~/styles/mantine-theme'
import appCss from '~/styles/app.css?url'

const profileColorSchemeManager: MantineColorSchemeManager = {
  get: (defaultValue) => defaultValue,
  set: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  clear: () => {},
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => {
    const user = await fetchUserFn()
    const me = user ? await getMeFn().catch(() => null) : null
    return { user, me }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#197f9a' },
      { name: 'application-name', content: 'Sheetless' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Sheetless' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      {
        title: 'Sheetless',
      },
      {
        name: 'description',
        content: 'Structured strength training tracker for planned progression.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/pwa/apple-touch-icon.png' },
    ],
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
  const initialThemePreference = me?.themePreference ?? 'system'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript
          defaultColorScheme={toMantineColorScheme(initialThemePreference)}
          forceColorScheme={toForcedColorScheme(initialThemePreference)}
        />
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
  const themePreference = previewThemePreference ?? me?.themePreference ?? 'system'

  useEffect(() => {
    const handlePreview = (event: Event) => {
      const preference = (event as CustomEvent<ThemePreference>).detail
      setPreviewThemePreference(preference)
    }
    const handlePreviewClear = () => setPreviewThemePreference(null)
    window.addEventListener('sheetless-theme-preview', handlePreview)
    window.addEventListener('sheetless-theme-preview-clear', handlePreviewClear)
    return () => {
      window.removeEventListener('sheetless-theme-preview', handlePreview)
      window.removeEventListener('sheetless-theme-preview-clear', handlePreviewClear)
    }
  }, [])

  return (
    <MantineProvider
      theme={mantineTheme}
      colorSchemeManager={profileColorSchemeManager}
      cssVariablesResolver={mantineCssVariablesResolver}
      defaultColorScheme={toMantineColorScheme(themePreference)}
      forceColorScheme={toForcedColorScheme(themePreference)}
    >
      <AppShell user={user}>{children}</AppShell>
      <Notifications position="top-right" limit={4} />
      <PwaUpdatePrompt />
      {import.meta.env.DEV ? (
        <div className="hidden md:block">
          <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
          <TanStackRouterDevtools position="bottom-right" />
        </div>
      ) : null}
    </MantineProvider>
  )
}

function toMantineColorScheme(preference: ThemePreference) {
  return preference === 'system' ? 'auto' : preference
}

function toForcedColorScheme(preference: ThemePreference) {
  return preference === 'system' ? undefined : preference
}
