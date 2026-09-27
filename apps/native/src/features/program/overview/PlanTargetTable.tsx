import { ScrollView, View, useWindowDimensions } from 'react-native'
import type { ProgramPlan } from '@sheetless/domain/program/program-plan'
import type { Unit } from '@sheetless/domain/shared/types'
import { shortLiftLabel } from '@sheetless/domain/program/program-trajectory'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function PlanTargetTable({ plan, units, compact = false }: { plan: ProgramPlan; units: Unit; compact?: boolean }) {
  const { theme } = useTokens()
  const { fontScale } = useWindowDimensions()
  const labelWidth = 78 * Math.max(1, fontScale)
  const cellWidth = 63 * Math.max(1, fontScale)
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>Heaviest target each week · {units}</SectionLabel>
    {!plan.lifts.length ? <Caption>No numeric main-lift targets in this plan.</Caption> : <>
      <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled">
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 6 }}>
            <View style={{ width: labelWidth }} />
            {plan.lifts.map(lift => <View key={lift.movementId} style={{ width: cellWidth, paddingHorizontal: 3 }}>
              <Text size="xs" tone="dimmed" weight={700}>{shortLiftLabel(lift.movementId)}</Text>
            </View>)}
          </View>
          {plan.weeks.map(week => <View key={week.index} style={{ flexDirection: 'row', alignItems: 'center',
            borderTopWidth: compact ? 0 : 1, borderColor: theme.border, paddingVertical: compact ? 4 : 8,
            backgroundColor: week.status === 'current' ? theme.tones.action.soft : 'transparent' }}>
            <View style={{ width: labelWidth, paddingRight: 4 }}>
              <Text size={compact ? 'xs' : 'sm'} weight={week.status === 'current' ? 800 : 600}>{compact ? `W${week.number} · ${week.phaseLabel.replace(/ week$/i, '')}` : `Week ${week.number}`}</Text>
              {!compact ? <Text size="xs" tone="dimmed">{week.phaseLabel}{week.status === 'current' ? ' · now' : ''}</Text> : null}
            </View>
            {plan.lifts.map(lift => {
              const target = week.targets.find(item => item.movementId === lift.movementId)
              const value = target?.load != null ? formatNumber(target.load) : '—'
              return <View key={lift.movementId} accessible
                accessibilityLabel={`Week ${week.number}, ${lift.movementName}: ${value === '—' ? 'unavailable' : `${value} ${units}, ${target?.source === 'saved' ? 'saved prescription' : target?.source === 'mixed' ? 'saved prescription and current-reference preview' : 'current-reference preview'}`}`}
                style={{ width: cellWidth, paddingHorizontal: 3 }}>
                <Text size="sm" weight={week.status === 'current' ? 800 : 500}
                  tone={target?.source === 'preview' ? 'dimmed' : 'default'}>
                  {value}{target?.source === 'preview' ? '*' : target?.source === 'mixed' ? '†' : ''}
                </Text>
              </View>
            })}
          </View>)}
        </View>
      </ScrollView>
      <Caption>Saved prescription targets; * previews use current weights.{plan.weeks.some(week => week.targets.some(target => target.source === 'mixed')) ? ' † Saved and preview targets.' : ''}{plan.weeks.some(week => week.targets.some(target => target.source === 'unavailable')) ? ' — Details unavailable.' : ''}</Caption>
    </>}
  </Panel>
}
