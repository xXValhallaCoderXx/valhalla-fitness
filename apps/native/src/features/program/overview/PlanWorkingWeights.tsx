import { Pressable, View } from 'react-native'
import type { ProgramStateOverview } from '@sheetless/domain/program/types'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function PlanWorkingWeights({ states, onSelect }: {
  states: ProgramStateOverview[]; onSelect: (state: ProgramStateOverview) => void
}) {
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>Your working weights</SectionLabel>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {states.map(state => {
        const delta = state.value - state.startValue - (state.resetDelta ?? 0)
        return <Pressable key={state.stateKey} accessibilityRole="button"
          accessibilityLabel={`${state.movementName}, ${state.value} ${state.units}. View working weight details`}
          onPress={() => onSelect(state)} style={({ pressed }) => ({ minWidth: 130, flexBasis: '44%', flexGrow: 1, minHeight: 64, opacity: pressed ? 0.7 : 1 })}>
          <Caption>{state.movementName}</Caption>
          <Text weight={800}>{formatNumber(state.value)} {state.units} ›</Text>
          <Text size="xs" tone={delta > 0 ? 'success' : delta < 0 ? 'warning' : 'dimmed'} weight={600}>
            {delta === 0 ? 'No recorded progression change' : `${delta > 0 ? 'Up' : 'Down'} ${formatNumber(Math.abs(delta))} from progression`}
          </Text>
          {state.pendingDecision ? <Caption tone="warning">Pending review</Caption> : null}
        </Pressable>
      })}
    </View>
    <Caption>{states.length ? 'These programme references set your workout targets. Tap one to see what changed it.' : 'This plan has no numeric working-weight references.'}</Caption>
  </Panel>
}
