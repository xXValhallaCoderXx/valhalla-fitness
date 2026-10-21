import { Stack } from 'expo-router'
import { useSession } from '@/lib/session-provider'
import { InsightsStateProvider } from './InsightsState'

export function InsightsLayout() {
  const { user } = useSession()
  return <InsightsStateProvider accountId={user?.id ?? 'anonymous'}>
    <Stack key={user?.id ?? 'anonymous'} screenOptions={{ headerShown: false }} />
  </InsightsStateProvider>
}
