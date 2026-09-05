import { View } from 'react-native'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { countCompletedSets, nextIncompleteSetLabel } from '@sheetless/domain/session/today-page'
import { countPlannedSets } from '@sheetless/domain/session/today-numbers'
import { Badge, Button, Heading, Panel, StatCard } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TodayActiveSessionCard({
  session,
  onResume,
}: {
  session: WorkoutSession
  onResume: () => void
}) {
  const { theme } = useTokens()
  const done = countCompletedSets(session)
  const total = countPlannedSets(session)

  return (
    <Panel style={{ borderColor: theme.tones.action.border, gap: spacing.sm, padding: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <Badge tone="action" variant="filled">
          In progress
        </Badge>
        {session.hardness ? <Badge tone="warning">{session.hardness}</Badge> : null}
      </View>
      <Heading order={2}>{session.title}</Heading>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatCard label="Completed sets" value={`${done}/${total}`} />
        <StatCard
          label="Next up"
          value={nextIncompleteSetLabel(session) ?? 'All done'}
          tone="action"
        />
      </View>
      <Button label="Resume workout" fullWidth onPress={onResume} testID="today-resume" />
    </Panel>
  )
}
