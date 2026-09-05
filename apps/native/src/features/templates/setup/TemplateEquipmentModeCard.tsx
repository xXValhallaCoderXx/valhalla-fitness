import { View } from 'react-native'
import type { ProgramEquipmentMode } from '@sheetless/domain/program/types'
import { Badge, Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function TemplateEquipmentModeCard({
  mode,
  replacementCount,
  unresolvedCount,
  reviewNeeded,
  disabled = false,
  onChange,
  onReview,
}: {
  mode: ProgramEquipmentMode
  replacementCount: number
  unresolvedCount: number
  reviewNeeded: boolean
  disabled?: boolean
  onChange: (mode: ProgramEquipmentMode) => void
  onReview: () => void
}) {
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 3 }}>
          <SectionLabel>Equipment mode</SectionLabel>
          <Text size="sm" weight={800}>
            {mode === 'free_weight' ? 'Free weights only' : 'All equipment'}
          </Text>
        </View>
        <Badge tone={mode === 'free_weight' ? 'action' : 'neutral'}>
          {mode === 'free_weight' ? `${replacementCount} reviewed` : 'Standard'}
        </Badge>
      </View>
      <Caption>
        Free weights only replaces cable and machine work across every future phase. Replacement loads start blank.
      </Caption>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <Button
          label="All equipment"
          variant={mode === 'standard' ? 'filled' : 'default'}
          selected={mode === 'standard'}
          disabled={disabled}
          style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
          onPress={() => onChange('standard')}
        />
        <Button
          label="Free weights only"
          variant={mode === 'free_weight' ? 'filled' : 'default'}
          selected={mode === 'free_weight'}
          disabled={disabled}
          style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
          onPress={() => onChange('free_weight')}
        />
      </View>
      {mode === 'free_weight' ? (
        <View style={{ gap: spacing.xs }}>
          {reviewNeeded || unresolvedCount ? (
            <Text size="sm" tone="warning">
              {unresolvedCount
                ? `${unresolvedCount} replacement${unresolvedCount === 1 ? '' : 's'} must be resolved.`
                : 'Setup changed. Review the replacements again before starting.'}
            </Text>
          ) : (
            <Text size="sm" tone="success">Every future phase has a reviewed free-weight setup.</Text>
          )}
          <Button
            label="Review replacements"
            variant="default"
            fullWidth
            disabled={disabled}
            style={{ minHeight: 44 }}
            onPress={onReview}
          />
        </View>
      ) : null}
    </Panel>
  )
}
