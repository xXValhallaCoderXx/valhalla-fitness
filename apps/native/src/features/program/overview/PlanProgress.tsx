import { View } from 'react-native'
import type { ProgramPlan } from '@sheetless/domain/program/program-plan'
import { Button, Caption, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function PlanProgress({ plan, advanced, onTargets }: {
  plan: ProgramPlan; advanced: boolean; onTargets: () => void
}) {
  const { theme } = useTokens()
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs }}>
      <Text weight={800}>{plan.completedSessions} of {plan.totalSessions} sessions done</Text>
      <Text size="sm" weight={700} tone="action">{plan.totalSessions - plan.completedSessions} left</Text>
    </View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Current cycle progress"
      accessibilityValue={{ min: 0, max: plan.totalSessions, now: plan.completedSessions }}
      style={{ height: 6, borderRadius: 3, backgroundColor: theme.surfaceInset, overflow: 'hidden' }}>
      <View style={{ height: 6, width: `${100 * plan.completedSessions / plan.totalSessions}%`, backgroundColor: theme.primaryFill }} />
    </View>
    {advanced ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {plan.weeks.map(week => <View key={week.index} accessible accessibilityRole="progressbar"
        accessibilityLabel={`Week ${week.number}${week.status === 'current' ? ', current week' : ''}`}
        accessibilityValue={{ min: 0, max: week.sessionsTotal, now: week.sessionsDone }}
        style={{ flexGrow: 1, flexBasis: 52, gap: 5 }}>
        <Text size="xs" weight={week.status === 'current' ? 800 : 500}
          tone={week.status === 'current' ? 'action' : 'dimmed'}>W{week.number} · {week.sessionsDone}/{week.sessionsTotal}</Text>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.surfaceInset, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${100 * week.sessionsDone / Math.max(1, week.sessionsTotal)}%`, backgroundColor: theme.primaryFill }} />
        </View>
      </View>)}
    </View> : <Caption>Progress through this cycle, one workout at a time.</Caption>}
    <Button label="Top sets, week by week" variant="subtle" onPress={onTargets} />
  </Panel>
}
