import { Pressable, View } from 'react-native'
import { Scan } from 'lucide-react-native'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { formatSetTarget, previousSetShort } from '@sheetless/domain/session/live-session-utils'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { WorkoutLogger } from '../editing/useWorkoutLogger'
import { FocusSetProgressBar } from './FocusSetProgressBar'

/** Both views render the same controlled card; only its composition changes. */
export function FocusSetCard({ session, movement, logger, overview, onFocus, onAdjust, onTools }: {
  session: WorkoutSession; movement: MovementSlot; logger: WorkoutLogger; overview: boolean
  onFocus: () => void; onAdjust: () => void; onTools: () => void
}) {
  const { theme } = useTokens()
  const { set, input } = logger
  if (!set) return null
  const number = movement.sets.indexOf(set) + 1
  const previous = previousSetShort(movement.previous, set.setIndex)
  const numbers = (
    <Pressable accessibilityRole="button" accessibilityLabel="Adjust this set" onPress={onAdjust}
      style={{ alignItems: overview ? 'flex-start' : 'center', gap: overview ? 4 : 8, paddingVertical: overview ? 0 : spacing.xs }}>
      {overview ? <Text weight={800} style={{ fontSize: 30, lineHeight: 34 }}>{input.load || '—'} {session.units} × {input.reps || '—'}</Text>
        : <><Text weight={800} style={{ fontSize: 56, lineHeight: 60 }}>{input.load || '—'}<Text size="lg" tone="dimmed"> {session.units}</Text></Text>
          <Text weight={800} style={{ fontSize: 24, lineHeight: 30 }}>× {input.reps || '—'} reps</Text></>}
      <View style={{ gap: 4, alignItems: overview ? 'flex-start' : 'center' }}>
        <Text size="sm" style={{ textAlign: overview ? 'left' : 'center' }}>
          {set.targetRir != null ? `Leave about ${set.targetRir} reps in the tank.` : `Target ${formatSetTarget(set, session.units, true, movement)}`}
        </Text>
        {previous ? <Caption>{previous.replace('previous', 'Last time')}</Caption> : null}
      </View>
    </Pressable>
  )
  const controls = (
    <View style={{ gap: spacing.sm }}>
      <FocusSetProgressBar movement={movement} selectedSetIndex={set.setIndex} onSelectSet={logger.selectSet} />
      {logger.failed ? <Text size="sm" tone="danger">Last save failed. Your values are kept; retry to save this set.</Text> : null}
      {!logger.valid ? <Caption>Enter a weight (0 for bodyweight) and whole-number reps in Adjust.</Caption> : null}
      <Button label={logger.label === 'Log set' ? 'Log this set' : logger.label} size="lg" fullWidth loading={logger.saving} disabled={logger.disabled || !logger.valid}
        onPress={() => logger.submit(logger.failed ? set.completed : true)} testID="focus-log-set" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Adjust this set" size="sm" variant="default" style={{ flex: 1 }} onPress={onAdjust} />
        <Button label="Tools" size="sm" variant="default" style={{ flex: 1 }} onPress={onTools} />
      </View>
    </View>
  )
  return overview ? (
    <Panel style={{ padding: spacing.md, gap: spacing.xs, borderRadius: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
        <View style={{ flex: 1 }}><SectionLabel tone="accent">{movement.role === 'main' ? 'Main lift' : movement.role} · Set {number} of {movement.sets.length}</SectionLabel></View>
        <Button label="Focus" size="sm" variant="default" onPress={onFocus} leftSection={<Scan size={14} color={theme.tones.action.text} />} />
      </View>
      <Heading order={2}>{movement.performedMovementName ?? movement.movementName}</Heading>
      {numbers}<View style={{ marginTop: spacing.xs }}>{controls}</View>
    </Panel>
  ) : (
    <View style={{ gap: spacing.sm }}>
      <Panel style={{ padding: spacing.lg, paddingVertical: 20, alignItems: 'center', borderRadius: 20 }}>
        <SectionLabel>Set {number} of {movement.sets.length}</SectionLabel>{numbers}
      </Panel>
      {controls}
    </View>
  )
}
