import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="today" options={{ title: 'Today' }} />
      <Stack.Screen name="sessions/[sessionId]" options={{ title: 'Workout' }} />
    </Stack>
  )
}
