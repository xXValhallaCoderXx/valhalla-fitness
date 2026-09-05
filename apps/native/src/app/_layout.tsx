import '@/lib/uuid-polyfill'

import { useEffect, useMemo, useRef } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { Redirect, Stack, useSegments } from 'expo-router'
import { NavigationBar } from 'expo-navigation-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { StatusBar } from 'expo-status-bar'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/query-client'
import { SessionProvider, useSession } from '@/lib/session-provider'
import { SheetlessThemeProvider, useSheetlessTheme } from '@/lib/theme-provider'
import { useTokens } from '@/lib/tokens'

SplashScreen.preventAutoHideAsync()

const queryClient = createQueryClient()

function AuthGate() {
  const { status, user } = useSession()
  const { isThemeReady } = useSheetlessTheme()
  const segments = useSegments()
  const lastUserId = useRef<string | null>(null)

  useEffect(() => {
    if (status !== 'restoring' && (status === 'signedOut' || isThemeReady)) {
      SplashScreen.hideAsync()
    }
  }, [isThemeReady, status])

  // Account-scoped cache hygiene: never let one account's data serve another
  // (mirrors web's transitionAccountCache).
  useEffect(() => {
    const nextUserId = user?.id ?? null
    if (lastUserId.current !== null && lastUserId.current !== nextUserId) {
      queryClient.clear()
    }
    lastUserId.current = nextUserId
  }, [user?.id])

  // Hold the splash — rendering nothing avoids a flash of the wrong screen
  // on warm starts while the stored session restores.
  if (status === 'restoring' || (status === 'signedIn' && !isThemeReady)) return null

  const inAuthGroup = segments[0] === 'auth'
  if (status === 'signedOut' && !inAuthGroup) return <Redirect href="/auth" />
  if (status === 'signedIn' && inAuthGroup) return <Redirect href="/(tabs)" />

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="session/[sessionId]/index" options={{ headerShown: false }} />
      <Stack.Screen name="session/[sessionId]/summary" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="template/[templateId]" options={{ title: 'Programme' }} />
    </Stack>
  )
}

function ThemedApp() {
  const { theme } = useTokens()
  const navigationTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.primaryFill,
        background: theme.background,
        card: theme.backgroundElevated,
        text: theme.text,
        border: theme.border,
        notification: theme.tones.danger.text,
      },
    }
  }, [theme])

  useEffect(() => {
    if (Platform.OS !== 'web') void SystemUI.setBackgroundColorAsync(theme.background).catch(() => undefined)
  }, [theme.background])

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <NavigationBar style={theme.scheme} />
      <AuthGate />
    </ThemeProvider>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <SheetlessThemeProvider>
            <ThemedApp />
          </SheetlessThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
