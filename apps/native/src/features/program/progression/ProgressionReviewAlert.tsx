import { View } from 'react-native'
import { TrendingUp } from 'lucide-react-native'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function ProgressionReviewAlert({
  decisions,
  onReview,
}: {
  decisions: ProgressionDecision[]
  onReview: () => void
}) {
  const { theme } = useTokens()
  if (!decisions.length) return null

  const first = decisions[0]!
  return (
    <Panel
      surface="inset"
      style={{ borderColor: theme.tones.warning.border, gap: spacing.xs, padding: spacing.md }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
        <TrendingUp color={theme.tones.warning.text} size={18} />
        <SectionLabel tone="warning">
          {decisions.length} progression change{decisions.length === 1 ? '' : 's'} ready
        </SectionLabel>
      </View>
      <Text size="sm">
        {first.movementName}: {first.recommendation}
      </Text>
      <Caption>
        Review now or decide later. Planned workouts stay locked until every choice is resolved.
      </Caption>
      <Button
        label="Review changes"
        variant="light"
        tone="warning"
        onPress={onReview}
        testID="progression-review-open"
      />
    </Panel>
  )
}
