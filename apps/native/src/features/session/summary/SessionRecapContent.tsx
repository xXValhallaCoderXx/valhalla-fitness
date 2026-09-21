import type { User } from '@supabase/supabase-js'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { SessionSummary } from '@sheetless/domain/session/types'
import { postWorkoutFeedbackEligible } from '@sheetless/domain/feedback/post-workout'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Button, Panel, SectionLabel, Text } from '@/components'
import { PostWorkoutFeedback } from '@/features/feedback/PostWorkoutFeedback'
import { spacing } from '@/lib/tokens'
import { ReturnSessionNotice } from '../live/ReturnSessionNotice'
import { buildNativeWorkoutRecap } from './native-workout-recap'
import { RecapBestSet, RecapCompletion } from './RecapOverview'
import { SummaryDecisions } from './SummaryDecisions'
import { WorkoutSummaryRecap } from './WorkoutSummaryRecap'
import { AdHocSessionActions } from './AdHocSessionActions'

/** Both recap shells render the same saved facts, receipts and eligible actions. */
export function SessionRecapContent({ summary, user, mode = 'guided', freshFinish = false, onLeave }: {
  summary: SessionSummary
  user: User
  mode?: ExperienceMode
  freshFinish?: boolean
  onLeave?: () => void
}) {
  const client = useQueryClient()
  const workout = summary.session
  const recap = buildNativeWorkoutRecap(workout)
  const advanced = mode === 'full'
  const available = summary.decisionReceiptAvailable !== false
  const onResolved = (id: string, action: 'accepted' | 'dismissed') => {
    client.setQueryData<SessionSummary>(accountQueryKeys.sessionReceipt(user.id, workout.sessionId), current => current && ({
      ...current, decisions: current.decisions.map(decision => decision.id === id ? { ...decision, status: action } : decision),
    }))
  }
  return <>
    <RecapCompletion recap={recap} units={workout.units} advanced={advanced} />
    <ReturnSessionNotice session={workout} />
    <RecapBestSet recap={recap} session={workout} advanced={advanced} />
    {!available ? <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>What happens next</SectionLabel>
      <Text size="sm">Progression details are unavailable for this older workout.</Text>
      <Button label="Review current choices in Your Plan" variant="subtle" onPress={() => {
        onLeave?.()
        router.push('/(tabs)/program')
      }} />
    </Panel> : summary.decisions.length ? <SummaryDecisions decisions={summary.decisions} onResolved={onResolved}
      units={workout.units} user={user} advanced={advanced} /> : <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs }}>
      <SectionLabel>What happens next</SectionLabel>
      <Text size="sm">No progression changes were recorded for this workout.</Text>
    </Panel>}
    <WorkoutSummaryRecap session={workout} recap={recap} advanced={advanced} />
    <AdHocSessionActions user={user} session={workout} onRepeatStarted={onLeave} />
    {freshFinish && available && postWorkoutFeedbackEligible(workout, summary) ?
      <PostWorkoutFeedback key={`${user.id}-${workout.sessionId}`} user={user} session={workout} decisions={summary.decisions} /> : null}
  </>
}
