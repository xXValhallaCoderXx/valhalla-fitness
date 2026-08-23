import { useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { Check, TrendingUp } from 'lucide-react-native'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, Heading, Panel, Text } from '@/components'
import { ProgressionDecisionCard } from '@/features/program/ProgressionDecisionCard'
import {
  type ProgressionDecisionState,
  useProgressionReview,
} from '@/features/program/useProgressionReview'
import { spacing, useTokens } from '@/lib/tokens'

export function SummaryDecisions({
  decisions,
  units,
  user,
}: {
  decisions: ProgressionDecision[]
  units: Unit
  user: User
}) {
  const { theme } = useTokens()
  const [decided, setDecided] = useState<Map<string, ProgressionDecisionState>>(
    () => new Map(),
  )
  const review = useProgressionReview({
    user,
    onResolved: (decisionId, action) =>
      setDecided((current) =>
        new Map(current).set(decisionId, action === 'accepted' ? 'accepted' : 'kept'),
      ),
  })
  const pending = decisions.filter((decision) => !decided.has(decision.id))
  const appliedCount = [...decided.values()].filter((state) => state === 'accepted').length

  if (pending.length === 0) {
    return (
      <Panel
        style={{
          alignItems: 'center',
          borderColor: theme.tones.success.border,
          gap: spacing.xs,
          padding: spacing.lg,
        }}
      >
        <Check color={theme.tones.success.text} size={25} />
        <Heading order={3}>{appliedCount ? 'Next workout updated' : 'Current loads kept'}</Heading>
        <Text size="sm" tone="dimmed" align="center">
          {appliedCount
            ? `${appliedCount} load${appliedCount === 1 ? '' : 's'} updated for your next session.`
            : 'Nothing else to do.'}
        </Text>
      </Panel>
    )
  }

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
        <TrendingUp color={theme.tones.action.text} size={22} />
        <View style={{ flex: 1 }}>
          <Heading order={3}>
            {pending.length} load update{pending.length === 1 ? '' : 's'} ready
          </Heading>
          <Caption>Applies to your next workout.</Caption>
        </View>
      </View>

      <View style={{ gap: spacing.sm, padding: spacing.md }}>
        {decisions.map((decision) => (
          <ProgressionDecisionCard
            key={decision.id}
            decision={decision}
            units={units}
            state={decided.get(decision.id)}
            isSaving={review.isSaving}
            onResolve={(action) => review.resolve({ decisionId: decision.id, action })}
          />
        ))}

        {review.errorMessage ? (
          <Text size="sm" tone="danger">
            {review.errorMessage}
          </Text>
        ) : null}
        <Button
          label={`Apply all ${pending.length}`}
          fullWidth
          loading={review.isApplyingAll}
          disabled={review.isSaving && !review.isApplyingAll}
          onPress={() => review.applyAll(pending.map((decision) => decision.id))}
        />
      </View>
    </Panel>
  )
}
