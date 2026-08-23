import { useLocalSearchParams } from 'expo-router'
import { LiveSessionScreen } from '@/features/session/LiveSessionScreen'

export default function LiveSessionRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  return <LiveSessionScreen sessionId={sessionId} />
}
