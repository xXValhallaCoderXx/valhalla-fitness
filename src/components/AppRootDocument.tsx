import { useEffect, useState, type ReactNode } from 'react'
import { ColorSchemeScript, MantineProvider, type MantineColorSchemeManager } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { HeadContent, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { meQueryOptions } from '~/domains/account/queries'
import type { LoadedRootRouteContext } from '~/shared/lib/app-root-route'
import type { ThemePreference, UserProfile } from '~/shared/types'
import { mantineCssVariablesResolver, mantineTheme } from '~/styles/mantine-theme'
import { AppShell } from './AppShell'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

const profileColorSchemeManager: MantineColorSchemeManager = {
  get: (defaultValue) => defaultValue,
  set: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  clear: () => {},
}

export function AppRootDocument({
  children,
  routeContext,
}: Readonly<{ children: ReactNode; routeContext: LoadedRootRouteContext }>) {
  const initialThemePreference = routeContext.me?.themePreference ?? 'system'

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
        <QueryClientProvider client={routeContext.queryClient}>
          <ThemedAppShell user={routeContext.user} initialMe={routeContext.me}>
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
}: Readonly<{ children: ReactNode; initialMe: UserProfile | null; user: LoadedRootRouteContext['user'] }>) {
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
