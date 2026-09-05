import { View } from 'react-native'
import type { ProgramOverview, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { Badge, Button, Caption, Heading, Panel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function ActiveProgramBand({
  template,
  position,
  onOpen,
}: {
  template: ProgramTemplateSummary
  position?: ProgramOverview['position']
  onOpen: () => void
}) {
  const { theme } = useTokens()
  const percent = position && position.totalWeeks > 0
    ? Math.min(100, Math.max(0, Math.round((position.weekNumber / position.totalWeeks) * 100)))
    : null

  return (
    <Panel style={{ borderColor: theme.tones.action.border, gap: spacing.sm, padding: spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Badge tone="action" variant="filled">Active program</Badge>
        <Badge tone={template.origin === 'user_created' ? 'accent' : 'neutral'}>{template.sourceLabel}</Badge>
      </View>
      <Heading order={2}>{template.name}</Heading>
      <Text size="sm" tone="dimmed">{template.description}</Text>
      {position && percent != null ? (
        <View style={{ gap: 5 }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
            <Caption>Week {position.weekNumber} of {position.totalWeeks} · {position.phaseLabel}</Caption>
            <Caption tone="action">{percent}%</Caption>
          </View>
          <View style={{ backgroundColor: theme.surfaceInset, borderRadius: radii.xl, height: 7, overflow: 'hidden' }}>
            <View
              style={{
                backgroundColor: theme.tones.action.text,
                borderRadius: radii.xl,
                height: 7,
                width: `${percent}%` as `${number}%`,
              }}
            />
          </View>
        </View>
      ) : null}
      <Button label="View programme" variant="default" fullWidth onPress={onOpen} />
    </Panel>
  )
}
