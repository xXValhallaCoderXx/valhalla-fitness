import '@/lib/uuid-polyfill'

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { Stack } from 'expo-router'
import { useColorScheme } from 'react-native'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Phase 0 spike' }} />
        <Stack.Screen name="icu" options={{ title: 'Gate 1 · Hermes ICU' }} />
        <Stack.Screen name="auth" options={{ title: 'Gate 2 · Supabase auth' }} />
        <Stack.Screen name="tokens" options={{ title: 'Gate 4 · Tokens DS' }} />
      </Stack>
    </ThemeProvider>
  )
}
