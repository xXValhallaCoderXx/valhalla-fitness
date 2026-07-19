import { QueryClientProvider } from '@tanstack/react-query'
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SessionProvider, useSession } from '@/auth/SessionProvider'
import { installNativeQueryManagers, queryClient } from '@/query/query-client'
import { useAppTheme } from '@/theme/useAppTheme'

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useEffect(() => installNativeQueryManagers(), [])
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

function RootNavigator() {
  const { session, isLoading } = useSession()
  const { colors, mode } = useAppTheme()

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync()
  }, [isLoading])

  if (isLoading) return null
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ title: 'Signing in', headerBackVisible: false }} />
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  )
}
