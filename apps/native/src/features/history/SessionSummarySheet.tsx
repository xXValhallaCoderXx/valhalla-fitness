import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { Button, SheetModal, Text } from '@/components'
import { sessionQueryOptions } from '@/features/session/queries'
import { AdHocSessionActions } from '@/features/session/summary/AdHocSessionActions'
import { WorkoutSummaryRecap } from '@/features/session/summary/WorkoutSummaryRecap'

export function SessionSummarySheet({
  sessionId,
  user,
  onClose,
}: {
  sessionId: string | null
  user: User
  onClose: () => void
}) {
  const session = useQuery({
    ...sessionQueryOptions(user, sessionId ?? ''),
    enabled: Boolean(sessionId),
  })
  const recap = session.data ? buildWorkoutSummary(session.data) : null

  return (
    <SheetModal
      open={Boolean(sessionId)}
      title={session.data?.title ?? 'Workout summary'}
      onClose={onClose}
      footer={<Button label="Close" variant="default" fullWidth onPress={onClose} />}
      testID="session-summary-sheet"
    >
      {session.isPending ? <Text tone="dimmed">Loading workout summary…</Text> : null}
      {session.isError ? (
        <Text size="sm" tone="danger">
          {session.error instanceof Error ? session.error.message : 'Unable to load this workout.'}
        </Text>
      ) : null}
      {session.data && recap ? (
        <>
          <WorkoutSummaryRecap session={session.data} recap={recap} />
          <AdHocSessionActions user={user} session={session.data} onRepeatStarted={onClose} />
        </>
      ) : null}
    </SheetModal>
  )
}
