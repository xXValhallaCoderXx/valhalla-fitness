import type { ReactNode } from 'react'
import { useWindowDimensions, View } from 'react-native'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { formatRest } from '@sheetless/domain/session/rest-timer'
import type { SetInput } from '@sheetless/domain/session/set-draft'
import { Button, Caption, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { useRestTimerControls, useRestTimerState } from '../rest-timer/rest-timer-context'
import { FocusRing } from './FocusRing'
import { focusValueFontSize, setInputLabel } from './workout-display'

export function FocusRestCard({ movement, session, setIndex, input, complete, receipt }: {
  movement: MovementSlot; session: WorkoutSession; setIndex: number; input: SetInput; complete: boolean; receipt: ReactNode
}) {
  const rest = useRestTimerState()
  const { width, fontScale } = useWindowDimensions()
  const controls = useRestTimerControls()
  const set = movement.sets.find(item => item.setIndex === setIndex)
  return <View style={{ flexGrow: 1, gap: spacing.md }}>
    <View style={{ flexGrow: 1, justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
      <FocusRing movement={movement} selectedSetIndex={setIndex} fraction={rest.secondsLeft / (rest.durationSeconds || 1)}>
        <SectionLabel>Rest</SectionLabel>
        <Text weight={800} align="center" style={{ fontSize: focusValueFontSize(formatRest(rest.secondsLeft), width, fontScale) }}>{formatRest(rest.secondsLeft)}</Text>
        <Caption>of {formatRest(rest.durationSeconds ?? 0)}</Caption>
      </FocusRing>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Caption style={{ textAlign: 'center' }}>Rest after {rest.label}</Caption>
        <SectionLabel>{complete ? 'Every set is logged' : `Next · set ${setIndex} of ${movement.sets.length}`}</SectionLabel>
        {!complete && set ? <Text size="xl" weight={800} align="center">{setInputLabel(input, session.units)}</Text> : null}
        {!complete && set?.targetRir != null ? <Caption style={{ textAlign: 'center' }}>Leave about {set.targetRir} reps in the tank.</Caption> : null}
      </View>
    </View>
    <View style={{ gap: spacing.sm, marginTop: 'auto' }}>
      {receipt}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="+ 15s" accessibilityLabel="Add 15 seconds" variant="default" onPress={() => controls.addTime(15)} />
        <Button label={complete ? 'End rest' : `Start set ${setIndex} now`} style={{ flex: 1 }} onPress={controls.dismiss} />
      </View>
    </View>
  </View>
}
