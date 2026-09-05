import { useLocalSearchParams } from 'expo-router'
import { SessionSummaryScreen } from '@/features/session/SessionSummaryScreen'

export default function SessionSummaryRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  return <SessionSummaryScreen sessionId={sessionId} />
}
