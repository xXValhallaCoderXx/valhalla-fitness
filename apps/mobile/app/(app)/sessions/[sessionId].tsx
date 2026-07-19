import { SessionScreen } from '@/features/session/SessionScreen'
import { useLocalSearchParams } from 'expo-router'

export default function SessionRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  return <SessionScreen sessionId={sessionId} />
}
