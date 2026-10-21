import { Pressable, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { Badge, Caption, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { ReturnGuideDraft } from './useReturnGuideDraft'

export function ReturnOverview({ draft, disabled }: { draft: ReturnGuideDraft; disabled: boolean }) {
  const { theme } = useTokens()
  const { outlook, preview, program } = draft
  return <View style={{ gap: spacing.md }}>
    {draft.editing ? <Text size="sm">Your weights include progress already made. Adjust the guide at current weights, or restore normal sets and effort.</Text> : null}
    {draft.valid ? preview.settings.stages.map((stage, index) => <Panel key={index} surface="inset" style={{ padding: spacing.md, gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
        <Text weight={800}>Stage {index + 1} · {index === 0 ? 'ease back in' : 'build your rhythm'}</Text>
        <Badge tone="action">{stage.workouts} workouts</Badge>
      </View>
      <Text size="sm">Target {Math.round(stage.setFraction * 100)}% of your usual sets. Essential work stays.</Text>
      <Caption>{Object.keys(stage.setCounts).length ? 'Individual set counts also apply. ' : ''}Your plan advances normally; increases still need eligible completed work and your approval.</Caption>
    </Panel>) : null}
    {!outlook ? <Text size="sm" tone="warning">Check the values in Fine-tune before starting this guide.</Text> : null}
    <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
      <Text weight={800}>{outlook?.reviewAfter ? `After ${outlook.reviewAfter} more workouts, we ask` : draft.editing ? 'Review your return' : 'You choose when to return to full sets'}</Text>
      <Text size="sm">Choose whether to restore normal sets or stay lighter a while longer. Nothing switches back on its own.</Text>
      <Caption>Leave at least {preview.settings.minimumRir} reps in reserve. Suggested increases are capped at {preview.settings.defaultCap} {program.units} per programme reference.</Caption>
    </Panel>
    <Pressable accessibilityRole="button" accessibilityLabel="Fine-tune loads, sets and stages" disabled={disabled}
      onPress={() => draft.setStep('fineTune')} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
      <Panel style={{ padding: spacing.md, gap: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 3 }}><Text size="sm" weight={800}>Fine-tune loads, sets and stages</Text><Caption>Set each reference by hand and change the stage lengths.</Caption></View>
        <ChevronRight color={theme.textMuted} size={18} />
      </Panel>
    </Pressable>
  </View>
}
