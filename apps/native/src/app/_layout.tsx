import '@/lib/uuid-polyfill'

import { useEffect, useMemo, useRef } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { Stack } from 'expo-router'
import { AppNavigationBar } from '@/lib/AppNavigationBar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { nativeFonts } from '@/lib/fonts'
import * as SystemUI from 'expo-system-ui'
import { StatusBar } from 'expo-status-bar'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/query-client'
import { SessionProvider, useSession } from '@/lib/session-provider'
import { SheetlessThemeProvider, useSheetlessTheme } from '@/lib/theme-provider'
import { useTokens } from '@/lib/tokens'
import { entryScreenLayout } from '@/features/onboarding/EntryGate'

SplashScreen.preventAutoHideAsync()

const queryClient = createQueryClient()

function AuthGate() {
  const [fontsLoaded, fontError] = useFonts(nativeFonts)
  const { status, user } = useSession()
  const { isThemeReady } = useSheetlessTheme()
  const lastUserId = useRef<string | null>(null)

  useEffect(() => {
    if ((fontsLoaded || fontError) && status !== 'restoring' && (status === 'signedOut' || isThemeReady)) {
      SplashScreen.hideAsync()
    }
  }, [fontError, fontsLoaded, isThemeReady, status])

  // Account-scoped cache hygiene: never let one account's data serve another
  // (mirrors web's transitionAccountCache).
  useEffect(() => {
    const nextUserId = user?.id ?? null
    if (lastUserId.current !== null && lastUserId.current !== nextUserId) {
      queryClient.clear()
    }
    lastUserId.current = nextUserId
  }, [user?.id])

  // The splash can cover a mounted navigator while the initial theme loads. Once session
  // restoration finishes, keep the Stack alive: signing in starts a new profile/theme read,
  // and unmounting here would erase the auth continuation before EntryGate can use it.
  if ((!fontsLoaded && !fontError) || status === 'restoring') return null

  return (
    <Stack screenLayout={entryScreenLayout}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="first-run" options={{ headerShown: false }} />
      <Stack.Screen name="session/[sessionId]/index" options={{ headerShown: false }} />
      <Stack.Screen name="session/[sessionId]/summary" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="templates/index" options={{ headerShown: false }} />
      <Stack.Screen name="templates/find" options={{ headerShown: false }} />
      <Stack.Screen name="template/[templateId]/index" options={{ headerShown: false }} />
      <Stack.Screen name="template/[templateId]/setup" options={{ title: 'Programme setup' }} />
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
      <AppNavigationBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
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
