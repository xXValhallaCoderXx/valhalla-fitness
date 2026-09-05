import { useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { postWorkoutAnswerOptions, postWorkoutReasonOptions, type FeedbackAnswer, type FeedbackCategory } from '@sheetless/domain/feedback/feedback-options'
import { Button, Caption, Panel, SectionLabel, SegmentedControl, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { FeedbackFields } from './FeedbackFields'
import { useFeedbackSubmission } from './useFeedbackSubmission'
import { usePostWorkoutPrompt } from './usePostWorkoutPrompt'

export function PostWorkoutFeedback({ user, session, decisions }: { user: User; session: WorkoutSession; decisions: ProgressionDecision[] }) {
  const prompt = usePostWorkoutPrompt(user, session.sessionId)
  const submission = useFeedbackSubmission(user)
  const [answer, setAnswer] = useState<FeedbackAnswer | null>(null)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const busy = submission.pending || prompt.optOutPending
  const send = async (next: FeedbackAnswer) => {
    if (busy || (next !== 'yes' && !category)) return
    const success = await submission.send({ source: 'post_workout', answer: next,
      category: next === 'yes' ? null : category, message: next === 'yes' ? null : message,
      sessionId: session.sessionId, route: `/session/${session.sessionId}/summary`,
      metadata: { templateId: session.templateId, weekIndex: session.weekIndex, programTitle: session.programTitle,
        decisionCount: decisions.length, decisionIds: decisions.map((decision) => decision.id) },
    })
    if (success) await prompt.mark()
  }
  if (submission.sent) return <Panel style={{ padding: spacing.md }}><Text tone="success">Thanks — noted. This helps improve the beta.</Text></Panel>
  if (prompt.loadingError) return <Button label="Retry optional check-in" variant="subtle" onPress={prompt.retry} />
  if (!prompt.visible) return null
  return <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
    <SectionLabel>Beta check-in</SectionLabel>
    <Text weight={800}>Did Sheetless explain your next workout clearly?</Text>
    <SegmentedControl options={postWorkoutAnswerOptions} value={answer} disabled={busy} variant="segments"
      onChange={(next) => { setAnswer(next); if (next === 'yes') void send(next) }} accessibilityLabel="Was the next workout clear?" />
    {answer && answer !== 'yes' ? <>
      <Caption>What was confusing? Choose a reason.</Caption>
      <FeedbackFields options={postWorkoutReasonOptions} category={category} onCategory={setCategory}
        message={message} onMessage={setMessage} pending={busy} />
      <Button label="Send feedback" disabled={!category || busy} loading={submission.pending} onPress={() => void send(answer)} />
    </> : null}
    {submission.error ? <Text tone="danger">{submission.error}</Text> : null}
    {prompt.error ? <Text tone="danger">{prompt.error}</Text> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button label="Dismiss" variant="subtle" disabled={busy} onPress={() => { void prompt.mark() }} />
      <Button label="Don't ask again" variant="subtle" disabled={busy} loading={prompt.optOutPending} onPress={() => void prompt.optOut()} />
    </View>
  </Panel>
}
