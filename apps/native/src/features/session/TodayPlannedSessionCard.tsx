import { View } from 'react-native'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { countPlannedSets, formatPreviousHero } from '@sheetless/domain/session/today-numbers'
import type { Unit } from '@sheetless/domain/shared/types'
import {
  Badge,
  Button,
  Caption,
  Heading,
  Panel,
  SectionLabel,
  StatCard,
  Text,
} from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function TodayPlannedSessionCard({
  session,
  units,
  completedToday,
  pendingDecisionCount,
  isStarting,
  startDisabled,
  startError,
  onStart,
}: {
  session: PlannedSession
  units: Unit
  completedToday: boolean
  pendingDecisionCount: number
  isStarting: boolean
  startDisabled?: boolean
  startError: string | null
  onStart: () => void
}) {
  const { theme } = useTokens()
  const mainMovement =
    session.movements.find((movement) => movement.role === 'main') ?? session.movements[0]
  const previousLine = mainMovement
    ? formatPreviousHero(mainMovement.previous, session.units ?? units)
    : null

  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
        <Badge tone="action" variant="filled">
          Next session
        </Badge>
        {session.hardness ? <Badge tone="warning">{session.hardness}</Badge> : null}
        {session.equipmentMode === 'free_weight' ? <Badge tone="neutral">Free weights</Badge> : null}
      </View>

      <View style={{ gap: 2 }}>
        <Heading order={2}>{session.title}</Heading>
        <Text tone="dimmed" size="sm">
          {session.movements.length} movements
          {session.estimatedMinutes ? ` · ${session.estimatedMinutes} min` : ''}
        </Text>
      </View>

      {mainMovement ? (
        <Panel
          surface="inset"
          style={{
            backgroundColor: theme.tones.action.soft,
            borderColor: theme.tones.action.border,
            gap: 2,
            padding: spacing.md,
          }}
        >
          <SectionLabel tone="action">Main lift</SectionLabel>
          <Heading order={3}>{mainMovement.movementName}</Heading>
          {mainMovement.targetSummary ? <Text size="sm">{mainMovement.targetSummary}</Text> : null}
          {previousLine ? <Caption>{previousLine}</Caption> : null}
        </Panel>
      ) : null}

      <StatCard label="Planned sets" value={String(countPlannedSets(session))} />
      <Button
        label={completedToday ? 'Start next session' : 'Start workout'}
        fullWidth
        loading={isStarting}
        disabled={pendingDecisionCount > 0 || startDisabled}
        onPress={onStart}
        testID="today-start"
      />
      {startError ? (
        <Text tone="danger" size="sm">
          {startError}
        </Text>
      ) : null}
    </Panel>
  )
}
