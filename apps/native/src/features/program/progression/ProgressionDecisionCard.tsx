import type { User } from '@supabase/supabase-js'
import { DecisionFeedback } from '@/features/feedback/DecisionFeedback'
import { View } from 'react-native'
import { Check, Minus } from 'lucide-react-native'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { reviewDecisionView } from '@sheetless/domain/program/progression-review'
import type { Unit } from '@sheetless/domain/shared/types'
import { Badge, Button, Caption, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type {
  ProgressionDecisionState,
  ProgressionResolution,
} from './useProgressionReview'

export function ProgressionDecisionCard({
  decision,
  units,
  state,
  isSaving,
  onResolve,
  user,
}: {
  decision: ProgressionDecision
  user: User
  units: Unit
  state?: ProgressionDecisionState
  isSaving: boolean
  onResolve: (action: ProgressionResolution) => void
}) {
  const { theme } = useTokens()
  const view = reviewDecisionView(decision, units)
  const accepted = state === 'accepted'

  return (
    <Panel
      surface="inset"
      style={{
        backgroundColor: accepted ? theme.tones.success.soft : theme.surface2,
        borderColor: accepted ? theme.tones.success.border : theme.border,
        gap: spacing.xs,
        padding: spacing.sm,
      }}
    >
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: spacing.sm,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text size="sm" weight="800" numberOfLines={2}>
            {view.name}
          </Text>
          {view.kindLabel ? <Caption>{view.kindLabel}</Caption> : null}
        </View>
        {state ? (
          <Badge tone={accepted ? 'success' : 'neutral'}>
            {accepted ? 'Applied' : 'Kept'}
          </Badge>
        ) : null}
      </View>

      {view.isNumeric ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          <Caption>{view.currentLabel} →</Caption>
          <Text size="sm" tone="action" weight="800">
            {view.nextLabel}
          </Text>
          {view.deltaLabel ? (
            <Badge tone={view.delta && view.delta < 0 ? 'warning' : 'success'}>
              {view.deltaLabel}
            </Badge>
          ) : null}
        </View>
      ) : (
        <Text size="sm" tone="action" weight="700">
          {decision.recommendation}
        </Text>
      )}

      {view.reason ? <Caption>{view.reason}</Caption> : null}

      {state ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 5 }}>
          {accepted ? (
            <Check color={theme.tones.success.text} size={14} />
          ) : (
            <Minus color={theme.textMuted} size={14} />
          )}
          <Caption tone={accepted ? 'success' : 'dimmed'}>
            {accepted ? 'Your next workout will use this change.' : 'Your current value stays in place.'}
          </Caption>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Button
            label="Apply"
            disabled={isSaving}
            onPress={() => onResolve('accepted')}
          />
          <Button
            label="Keep"
            variant="default"
            disabled={isSaving}
            onPress={() => onResolve('dismissed')}
          />
        </View>
      )}
      <DecisionFeedback key={`${user.id}-${decision.id}`} user={user}
        decision={{ ...decision, status: state === 'accepted' ? 'accepted' : state === 'kept' ? 'dismissed' : decision.status }} />
    </Panel>
  )
}
