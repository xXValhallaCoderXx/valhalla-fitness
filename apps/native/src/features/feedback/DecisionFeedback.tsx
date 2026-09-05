import { useState } from 'react'
import { View } from 'react-native'
import { usePathname } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { buildDecisionFeedbackInput, decisionReasonOptions, type FeedbackCategory } from '@sheetless/domain/feedback/feedback-options'
import { Button, Caption, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { FeedbackFields } from './FeedbackFields'
import { useFeedbackSubmission } from './useFeedbackSubmission'

/** Expands inline, including inside an existing review sheet. Never resolves a decision. */
export function DecisionFeedback({ user, decision, sessionId }: { user: User; decision: ProgressionDecision; sessionId?: string }) {
  const route = usePathname()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const submission = useFeedbackSubmission(user)
  if (submission.sent) return <Caption tone="success">Feedback sent</Caption>
  return <View style={{ gap: spacing.sm }}>
    <Button label="Something off?" variant="subtle" disabled={submission.pending}
      accessibilityLabel={`Report an issue with the ${decision.movementName} recommendation`} onPress={() => setOpen(!open)} />
    {open ? <>
      <FeedbackFields options={decisionReasonOptions} category={category} onCategory={setCategory}
        message={message} onMessage={setMessage} pending={submission.pending} />
      {submission.error ? <Text tone="danger">{submission.error}</Text> : null}
      <Button label="Send feedback" disabled={!category} loading={submission.pending}
        onPress={() => { if (category) void submission.send(buildDecisionFeedbackInput(decision, { category, message, route, sessionId })) }} />
      <Caption>Feedback does not change your progression choice.</Caption>
    </> : null}
  </View>
}
