import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { ClipboardCheck } from 'lucide-react-native'
import { pendingDecisionCopy } from '@sheetless/domain/session/summary-decisions'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, Heading, Panel, Text } from '@/components'
import { ProgressionDecisionCard } from '@/features/program/progression/ProgressionDecisionCard'
import {
  useProgressionReview,
} from '@/features/program/progression/useProgressionReview'
import { spacing, useTokens } from '@/lib/tokens'

export function SummaryDecisions({
  decisions,
  units,
  user,
  onResolved,
}: {
  decisions: ProgressionDecision[]
  units: Unit
  user: User
  onResolved: (id: string, action: 'accepted' | 'dismissed') => void
}) {
  const { theme } = useTokens()
  const review = useProgressionReview({ user, onResolved })
  const pending = decisions.filter((decision) => decision.status === 'pending')
  const appliedCount = decisions.filter((decision) => decision.status === 'accepted').length
  const pendingCopy = pendingDecisionCopy(pending)

  return (
    <Panel style={{ borderColor: theme.tones.action.border, overflow: 'hidden' }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.tones.action.soft,
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.md,
        }}
      >
        <ClipboardCheck color={theme.tones.action.text} size={22} />
        <View style={{ flex: 1 }}>
          <Heading order={3}>
            {pending.length ? pendingCopy.heading : appliedCount ? 'Updates applied' : 'Choices reviewed'}
          </Heading>
          <Caption>{pending.length ? pendingCopy.body : 'Saved decisions for this workout.'}</Caption>
        </View>
      </View>

      <View style={{ gap: spacing.sm, padding: spacing.md }}>
        {pending.length ? <Caption>For future workouts. Nothing changes until you apply a recommendation.</Caption> : null}
        {decisions.map((decision) => (
          <ProgressionDecisionCard
            key={decision.id}
            decision={decision}
            user={user}
            units={units}
            state={decision.status === 'pending' ? undefined : decision.status === 'accepted' ? 'accepted' : decision.status === 'superseded' ? 'superseded' : 'kept'}
            isSaving={review.isSaving}
            onResolve={(action) => review.resolve({ decisionId: decision.id, action })}
          />
        ))}

        {review.errorMessage ? (
          <Text size="sm" tone="danger">
            {review.errorMessage}
          </Text>
        ) : null}
        {pending.length ? <Button
          label={`Apply all ${pending.length}`}
          fullWidth
          loading={review.isApplyingAll}
          disabled={review.isSaving && !review.isApplyingAll}
          onPress={() => review.applyAll(pending.map((decision) => decision.id))}
        /> : null}
      </View>
    </Panel>
  )
}
