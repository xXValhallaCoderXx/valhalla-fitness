import { useState } from 'react'
import { View } from 'react-native'
import { returnEstimateLabel } from '@sheetless/domain/program/return-outlook'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { useMe } from '@/lib/account'
import { ReturnReductionSlider } from './ReturnReductionSlider'
import type { ReturnGuideDraft } from './useReturnGuideDraft'
import { returnLogDaysAgo } from './return-log-recency'

const weight = (value: number) => Number(value.toFixed(2))

export function ReturnStartStep({ draft, disabled }: { draft: ReturnGuideDraft; disabled: boolean }) {
  const { theme } = useTokens()
  const { state, outlook, program } = draft
  const profile = useMe()
  const [now] = useState(() => new Date())
  const days = returnLogDaysAgo(state.lastWorkoutLogged, profile.data?.timezone, now)
  return <View style={{ gap: spacing.md }}>
    <Text size="sm">
      {days === null ? 'Choose a lighter starting point. ' : `You last logged a workout ${days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}. `}
      Keep your plan and everything you have done in it. These are editable starting suggestions, not a measure of lost strength.
    </Text>
    <Panel surface="inset" style={{ padding: spacing.md }}>
      <ReturnReductionSlider value={draft.percentage} onChange={draft.setPercentage} disabled={disabled} />
    </Panel>
    <View style={{ gap: spacing.xs }}>
      <SectionLabel>What that means for your main lifts · {program.units}</SectionLabel>
      {outlook?.lifts.map(lift => <View key={lift.key} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: theme.border, gap: 3 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs }}>
          <Text size="sm" weight={800}>{lift.name}</Text>
          <Text size="sm">{lift.reference ? <><Text size="sm" tone="dimmed">{weight(lift.reference.before)} → </Text><Text size="sm" weight={900}>{weight(lift.reference.after)}</Text></> : 'Choose loads while logging'}</Text>
        </View>
        <Caption>{lift.reference?.label ?? 'Manual load'}{lift.reference?.label === 'Training max' ? ' · sets use the plan’s percentages' : ''}</Caption>
      </View>)}
      {outlook && !outlook.lifts.length ? <Caption>No automatic main-lift references. Choose loads while logging or in Fine-tune.</Caption> : null}
      {!outlook ? <Caption tone="warning">Check the load and stage values in Fine-tune to see the preview.</Caption> : null}
    </View>
    {outlook ? <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs, backgroundColor: theme.tones.action.soft, borderColor: theme.tones.action.border }}>
      <Text weight={800}>{returnEstimateLabel(outlook.totalWorkouts, outlook.daysPerWeek)} to revisit your targets</Text>
      <Caption>At {outlook.daysPerWeek} workouts a week, if you finish the prescribed work and accept eligible increases. Held increases or missed workouts move this back.</Caption>
      <Caption>{outlook.lifts.some(lift => lift.lastWork) ? 'Targets use matching work logged before this return; otherwise the previous programme reference.' : 'Targets use your previous programme references.'}{outlook.hasPlusSets ? ' Plus sets assume two extra reps at the prescribed effort.' : ''}</Caption>
      {outlook.totalWorkouts === null ? <Caption>Manual or unreachable targets have no estimated date.</Caption> : null}
    </Panel> : null}
  </View>
}
