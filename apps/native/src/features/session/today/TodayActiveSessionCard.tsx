import { View } from 'react-native'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { countCompletedSets, nextIncompleteSetLabel } from '@sheetless/domain/session/today-page'
import { countPlannedSets } from '@sheetless/domain/session/today-numbers'
import { hasUnsettledSessionSets } from '@sheetless/domain/session/session-cache'
import { Badge, Button, Caption, Heading, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TodayActiveSessionCard({ session, onResume }: {
  session: WorkoutSession
  onResume: () => void
}) {
  const { theme } = useTokens()
  const done = countCompletedSets(session)
  const total = countPlannedSets(session)
  const next = nextIncompleteSetLabel(session)
  const unsettled = hasUnsettledSessionSets(session)

  return (
    <Panel style={{ borderColor: theme.tones.action.border, gap: spacing.sm, padding: spacing.lg }}>
      <View style={{ alignItems: 'flex-start', gap: spacing.sm }}>
        <Badge tone="action">In progress</Badge>
        <Heading order={2}>{session.title}</Heading>
      </View>
      <Text size="sm" tone="dimmed">{done} of {total} sets logged</Text>
      <View style={{ height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: theme.surface2 }}>
        <View style={{ height: 5, width: `${total ? Math.round(done / total * 100) : 0}%`, backgroundColor: theme.primaryFill }} />
      </View>
      <Text size="sm">{next ? `Next · ${next}` : total ? 'All sets logged. Review and finish when ready.' : 'Add your first movement to get started.'}</Text>
      <Button label="Resume workout" fullWidth onPress={onResume} testID="today-resume" style={{ minHeight: 52 }} />
      <Caption>{unsettled ? 'Some sets still need saving. Resume to check or retry them.' : 'Your confirmed sets are saved. Continue where you left off.'}</Caption>
    </Panel>
  )
}
