import { useState } from 'react'
import { Pressable, useWindowDimensions, View } from 'react-native'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { advanceAfterLog } from '@sheetless/domain/session/live-focus-utils'
import { formatSetTarget, previousSetShort } from '@sheetless/domain/session/live-session-utils'
import { Button, Caption, SectionLabel, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { WorkoutLogger } from '../editing/useWorkoutLogger'
import { FocusSetProgressBar } from './FocusSetProgressBar'
import { FocusRing } from './FocusRing'
import { focusValueFontSize, setLogLabel } from './workout-display'

/** Focus and Overview keep the same logger; only the presentation changes. */
export function FocusSetCard({ session, movement, logger, onAdjust, onTools }: {
  session: WorkoutSession; movement: MovementSlot; logger: WorkoutLogger
  onAdjust: () => void; onTools: () => void
}) {
  const { theme } = useTokens()
  const { width, fontScale } = useWindowDimensions()
  const [choosingSet, setChoosingSet] = useState(false)
  const { set, input } = logger
  if (!set) return null
  const number = movement.sets.indexOf(set) + 1
  const previous = previousSetShort(movement.previous, set.setIndex)
  const next = advanceAfterLog({ ...session, movements: session.movements.map(item => item.id !== movement.id ? item
    : { ...item, sets: item.sets.map(row => row.setIndex === set.setIndex ? { ...row, completed: true } : row) }) }, movement.id, set.setIndex)
  const nextMovement = next.kind !== 'sessionComplete' ? session.movements.find(item => item.id === next.movementId) : null
  const nextSet = next.kind !== 'sessionComplete' ? nextMovement?.sets.find(item => item.setIndex === next.setIndex) : null
  return <View style={{ flexGrow: 1, gap: spacing.md }}>
    <View style={{ flexGrow: 1, justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
      <FocusRing movement={movement} selectedSetIndex={set.setIndex}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Set ${number} of ${movement.sets.length}, choose a set`}
          onPress={() => setChoosingSet(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <SectionLabel>Set {number} of {movement.sets.length} ▾</SectionLabel>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Adjust this set" onPress={onAdjust} style={{ alignItems: 'center' }}>
          <Text weight={800} align="center" style={{ fontSize: focusValueFontSize(input.load || '—', width, fontScale, true) }}>{input.load || '—'}<Text size="lg"> {session.units}</Text></Text>
          <Text weight={800} style={{ fontSize: 24 }}>× {input.reps || '—'} reps</Text>
        </Pressable>
      </FocusRing>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text size="sm" weight={700} align="center">{set.targetRir != null ? `Leave about ${set.targetRir} reps in the tank`
          : `Target ${formatSetTarget(set, session.units, true, movement)}`}</Text>
        {previous ? <Caption style={{ textAlign: 'center' }}>{previous.replace('previous', 'Last time')}</Caption> : null}
      </View>
    </View>
    <View style={{ gap: spacing.sm, marginTop: 'auto' }}>
      {nextSet && nextMovement ? <View style={{ backgroundColor: theme.tones.action.soft, borderRadius: 12, padding: spacing.sm }}>
        <Caption><Text size="xs" weight={800}>THEN </Text>{nextMovement.id === movement.id ? `Set ${nextSet.setIndex}` : nextMovement.performedMovementName ?? nextMovement.movementName}
          {' · '}{formatSetTarget(nextSet, session.units, true, nextMovement)}</Caption>
      </View> : <Caption style={{ textAlign: 'center' }}>Your last set — Finish is in the workout menu.</Caption>}
      {logger.failed ? <Text size="sm" tone="danger">Last save failed. Your values are kept; retry to save this set.</Text> : null}
      {!logger.valid ? <Caption>Enter a weight (0 for bodyweight) and whole-number reps in Adjust.</Caption> : null}
      <Button label={setLogLabel(logger.label, input, session.units)} size="lg" fullWidth loading={logger.saving} disabled={logger.disabled || !logger.valid}
        onPress={() => logger.submit(logger.failed ? set.completed : true)} testID="focus-log-set" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Adjust" accessibilityLabel="Adjust this set" size="sm" variant="default" style={{ flex: 1 }} onPress={onAdjust} />
        <Button label="Tools" size="sm" variant="default" style={{ flex: 1 }} onPress={onTools} />
      </View>
    </View>
    <SheetModal open={choosingSet} showHandle title="Choose a set" onClose={() => setChoosingSet(false)}>
      <FocusSetProgressBar movement={movement} selectedSetIndex={set.setIndex} onSelectSet={index => { logger.selectSet(index); setChoosingSet(false) }} />
    </SheetModal>
  </View>
}
