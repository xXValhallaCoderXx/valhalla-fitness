import '@/lib/uuid-polyfill'

import { useEffect } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { Redirect, Stack, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/query-client'
import { SessionProvider, useSession } from '@/lib/session-provider'

SplashScreen.preventAutoHideAsync()

const queryClient = createQueryClient()

function AuthGate() {
  const { status } = useSession()
  const segments = useSegments()

  useEffect(() => {
    if (status !== 'restoring') SplashScreen.hideAsync()
  }, [status])

  // Hold the splash — rendering nothing avoids a flash of the wrong screen
  // on warm starts while the stored session restores.
  if (status === 'restoring') return null

  const inAuthGroup = segments[0] === 'auth'
  const inDevGroup = segments[0] === '(dev)'
  if (status === 'signedOut' && !inAuthGroup && !inDevGroup) return <Redirect href="/auth" />
  if (status === 'signedIn' && inAuthGroup) return <Redirect href="/(tabs)" />

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(dev)/icu" options={{ title: 'Dev · Hermes ICU' }} />
      <Stack.Screen name="(dev)/tokens" options={{ title: 'Dev · Tokens' }} />
    </Stack>
  )
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SessionProvider>
            <AuthGate />
          </SessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
