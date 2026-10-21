import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { buildWorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { formatFullDate, formatWeekdayLongDate } from '@sheetless/domain/shared/dates'
import { Button, SheetModal, Text } from '@/components'
import { useMe } from '@/lib/account'
import { sessionSummaryQueryOptions } from '@/features/session/queries'
import { SessionRecapContent } from '@/features/session/summary/SessionRecapContent'
import { RecapActions } from '@/features/session/summary/RecapLayout'
import { WorkoutSharePreview } from '../sharing/WorkoutSharePreview'

type SummarySheetProps = { sessionId: string | null; user: User; onClose: () => void }

export function SessionSummarySheet(props: SummarySheetProps) {
  return props.sessionId ? <SummarySheetContent key={`${props.user.id}:${props.sessionId}`} {...props} /> : null
}

function SummarySheetContent({ sessionId, user, onClose }: SummarySheetProps) {
  const [sharing, setSharing] = useState(false)
  const me = useMe()
  const query = useQuery(sessionSummaryQueryOptions(user, sessionId!))
  // Never show cached actions until this visit's receipt has been read successfully.
  const ready = !query.isError && query.isFetchedAfterMount && query.data
  const workout = ready ? ready.session : null
  const model = workout ? buildWorkoutShareModel(workout) : null
  const mode = me.data?.experienceMode ?? 'guided'
  const close = () => sharing ? setSharing(false) : onClose()
  const date = workout ? mode === 'full' ? formatFullDate(workout.scheduledDate) : formatWeekdayLongDate(workout.scheduledDate) : undefined
  return <SheetModal open title={sharing && ready ? 'Share workout' : workout?.title ?? 'Workout recap'}
    eyebrow={sharing ? undefined : [date, mode === 'full' && workout?.weekLabel].filter(Boolean).join(' · ')}
    onClose={close} testID="session-summary-sheet"
    footer={sharing && ready ? undefined : <RecapActions onShare={model ? () => setSharing(true) : undefined} onDone={onClose} />}>
    {query.isError ? <>
      <Text tone="danger">{query.error instanceof Error ? query.error.message : 'Unable to load this recap.'}</Text>
      <Button label="Retry summary" loading={query.isFetching} onPress={() => void query.refetch()} />
    </> : !ready ? <Text>Loading your recap…</Text>
      : sharing && model ? <WorkoutSharePreview model={model} onBack={() => setSharing(false)} /> : <>
        {me.isError ? <Button label="Retry display preference" variant="subtle" onPress={() => void me.refetch()} /> : null}
        <SessionRecapContent summary={ready} user={user} mode={mode} onLeave={onClose} />
      </>}
  </SheetModal>
}
