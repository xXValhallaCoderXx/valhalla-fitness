import { useState } from 'react'
import { buildWorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { WorkoutSharePreview } from '../sharing/WorkoutSharePreview'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { buildWorkoutSummary } from '@sheetless/domain/history/workout-summary'
import { Button, SheetModal, Text } from '@/components'
import { sessionQueryOptions } from '@/features/session/queries'
import { AdHocSessionActions } from '@/features/session/summary/AdHocSessionActions'
import { WorkoutSummaryRecap } from '@/features/session/summary/WorkoutSummaryRecap'

type SummarySheetProps = {
  sessionId: string | null
  user: User
  onClose: () => void
}

export function SessionSummarySheet(props: SummarySheetProps) {
  return props.sessionId ? <SummarySheetContent key={`${props.user.id}:${props.sessionId}`} {...props} /> : null
}

function SummarySheetContent({ sessionId, user, onClose }: SummarySheetProps) {
  const [sharing, setSharing] = useState(false)
  const session = useQuery({
    ...sessionQueryOptions(user, sessionId ?? ''),
    enabled: Boolean(sessionId),
  })
  const shareModel = session.data ? buildWorkoutShareModel(session.data) : null
  const recap = session.data ? buildWorkoutSummary(session.data) : null

  return (
    <SheetModal
      open={Boolean(sessionId)}
      title={sharing ? 'Share workout' : session.data?.title ?? 'Workout summary'}
      onClose={onClose}
      footer={sharing ? undefined : <Button label="Close" variant="default" fullWidth onPress={onClose} />}
      testID="session-summary-sheet"
    >
      {session.isPending ? <Text tone="dimmed">Loading workout summary…</Text> : null}
      {session.isError ? (
        <>
        <Text size="sm" tone="danger">
          {session.error instanceof Error ? session.error.message : 'Unable to load this workout.'}
        </Text>
        <Button label="Retry summary" variant="default" onPress={() => void session.refetch()} />
        </>
      ) : null}
      {sharing && shareModel ? <WorkoutSharePreview model={shareModel} onBack={() => setSharing(false)} /> : session.data && recap ? (
        <>
          {shareModel ? <Button label="Share workout" variant="default" onPress={() => setSharing(true)} /> : null}
          <WorkoutSummaryRecap session={session.data} recap={recap} />
          <AdHocSessionActions user={user} session={session.data} onRepeatStarted={onClose} />
        </>
      ) : null}
    </SheetModal>
  )
}
