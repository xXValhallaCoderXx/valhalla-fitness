import { View } from 'react-native'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { createAccountClock, describeWorkoutDate } from '@sheetless/domain/shared/dates'
import { formatNumber } from '@sheetless/domain/shared/set-notation'
import { Badge, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function ProgramDetails({ overview }: { overview: ProgramOverview }) {
  return (
    <>
      <CurrentLoads overview={overview} />
      <RecentSessions overview={overview} />
    </>
  )
}

function CurrentLoads({ overview }: { overview: ProgramOverview }) {
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SectionLabel>Current loads</SectionLabel>
        <Badge>{overview.activeProgram?.units ?? 'kg'}</Badge>
      </View>
      <Caption>Training numbers used to calculate planned weights.</Caption>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {overview.stateValues.map((state) => {
          const delta = state.value - state.startValue
          return (
            <Panel key={state.stateKey} surface="inset" style={{ flexGrow: 1, minWidth: 135, padding: spacing.sm }}>
              <Caption>{state.movementName}</Caption>
              <Text weight={900}>{formatNumber(state.value)} {state.units}</Text>
              {delta ? (
                <Text size="xs" tone={delta > 0 ? 'success' : 'danger'} weight={700}>
                  {delta > 0 ? '+' : ''}{formatNumber(delta)} since week 1
                </Text>
              ) : null}
              {state.pendingDecision ? <Caption tone="warning">Pending review</Caption> : null}
            </Panel>
          )
        })}
      </View>
      {overview.stateValues.length === 0 ? <Caption>No load-based state for this program.</Caption> : null}
    </Panel>
  )
}

function RecentSessions({ overview }: { overview: ProgramOverview }) {
  const { theme } = useTokens()
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Recent sessions</SectionLabel>
      {overview.recentSessions.slice(0, 3).map((session, index) => {
        const clock = createAccountClock({ timeZone: session.timeZone })
        const date = describeWorkoutDate({
          scheduledDate: session.scheduledDate,
          completedAt: session.completedAt,
          timeZone: session.timeZone,
          today: clock.today,
        })
        const complete = session.plannedSetCount > 0 && session.completedSetCount >= session.plannedSetCount
        return (
          <View
            key={session.id}
            style={{
              alignItems: 'center',
              borderTopColor: theme.border,
              borderTopWidth: index ? 1 : 0,
              flexDirection: 'row',
              gap: spacing.sm,
              paddingTop: index ? spacing.sm : 0,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" weight={800} numberOfLines={1}>{session.title}</Text>
              <Caption>{date.compactDate} · {date.relativeDate}</Caption>
              {session.topSetHighlights[0] ? <Caption numberOfLines={1}>{session.topSetHighlights[0]}</Caption> : null}
            </View>
            <Badge tone={complete ? 'success' : 'warning'}>
              {session.completedSetCount}/{session.plannedSetCount}
            </Badge>
          </View>
        )
      })}
      {overview.recentSessions.length === 0 ? <Caption>No completed sessions for this program yet.</Caption> : null}
    </Panel>
  )
}
