import { Pressable, View } from 'react-native'
import { Scan, SlidersHorizontal } from 'lucide-react-native'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { formatSetTarget, previousSetShort } from '@sheetless/domain/session/live-session-utils'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import type { WorkoutLogger } from '../editing/useWorkoutLogger'
import { recordedSetLabel } from '../summary/native-workout-recap'
import { confirmed, setInputLabel, setLogLabel, workoutSetDetail } from '../focus/workout-display'

export function WorkoutSetTable({ session, movement, logger, advanced, ordinal, onFocus, onAdjust, onTools }: {
  session: WorkoutSession; movement: MovementSlot; logger: WorkoutLogger; advanced: boolean; ordinal: number
  onFocus: () => void; onAdjust: () => void; onTools: () => void
}) {
  const { theme } = useTokens()
  const selected = logger.set
  if (!selected) return null
  const previous = previousSetShort(movement.previous, selected.setIndex)
  return <Panel style={{ padding: spacing.md, gap: spacing.sm, borderRadius: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <View style={{ flex: 1, gap: 4 }}>
        <SectionLabel tone="accent">{movement.role === 'main' ? 'Main lift' : movement.role} · {ordinal} of {session.movements.length} exercises</SectionLabel>
        <Heading order={2}>{movement.performedMovementName ?? movement.movementName}</Heading>
      </View>
      <Pressable onPress={onTools} accessibilityRole="button" accessibilityLabel="Tools for this exercise"
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12,
          backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border }}>
        <SlidersHorizontal size={18} color={theme.textMuted} />
      </Pressable>
      <Button label="Focus" size="sm" variant="default" onPress={onFocus} leftSection={<Scan size={14} color={theme.tones.action.text} />} />
    </View>
    <View>
      {movement.sets.map((set, index) => {
        const active = selected.setIndex === set.setIndex
        const saved = confirmed(set)
        const failed = set.syncState === 'syncFailed'
        const detail = workoutSetDetail(set, movement, session, advanced)
        const draft = active ? logger.input : failed || set.syncState === 'saving' ? logger.draftForSet(set.setIndex) : undefined
        const result = draft ? setInputLabel(draft, session.units)
          : saved || failed || set.syncState === 'saving' ? recordedSetLabel(set, session.units) : formatSetTarget(set, session.units, true, movement)
        return <View key={set.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14,
          borderWidth: active ? 1 : 0, borderColor: failed ? theme.tones.danger.border : theme.tones.action.border,
          backgroundColor: active ? theme.tones.action.soft : 'transparent' }}>
          <Pressable onPress={() => logger.selectSet(set.setIndex)} accessibilityRole="button"
            accessibilityLabel={`Set ${set.setIndex}, ${failed ? 'save failed' : set.syncState === 'saving' ? 'saving' : saved ? 'logged' : 'unlogged'}, ${result}`}
            accessibilityState={{ selected: active }} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
              backgroundColor: failed ? theme.tones.danger.soft : saved ? theme.tones.success.soft : active ? theme.primaryFill : theme.surface2 }}>
              <Text size="xs" weight={800} style={{ color: active && !saved && !failed ? theme.primaryFillText : saved ? theme.tones.success.text : theme.textMuted }}>
                {failed ? '!' : saved ? '✓' : index + 1}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
                <Text weight={active ? 800 : 600} style={active ? { fontSize: 24 } : undefined}>{result}</Text>
                {set.isTopSet ? <SectionLabel tone="accent">Top set</SectionLabel> : null}
                {set.isBackoff ? <SectionLabel>Back-off</SectionLabel> : null}
                {set.isAmrap && !set.isTopSet ? <SectionLabel tone="accent">{advanced ? 'AMRAP' : 'As many reps as you can'}</SectionLabel> : null}
              </View>
              {detail ? <Caption tone={failed ? 'danger' : saved ? 'success' : 'dimmed'}>{detail}</Caption> : null}
              {active && previous ? <Caption>{previous.replace('previous', 'Last time')}</Caption> : null}
            </View>
          </Pressable>
          {active ? <Button label="Adjust" size="sm" variant="subtle" onPress={onAdjust} /> : null}
        </View>
      })}
    </View>
    {logger.failed ? <Text size="sm" tone="danger">Last save failed. Your values are kept; retry to save this set.</Text> : null}
    {!logger.valid ? <Caption>Enter a weight (0 for bodyweight) and whole-number reps in Adjust.</Caption> : null}
    <Button label={setLogLabel(logger.label, logger.input, session.units)} size="lg" fullWidth loading={logger.saving}
      disabled={logger.disabled || !logger.valid} onPress={() => logger.submit(logger.failed ? selected.completed : true)} testID="focus-log-set" />
  </Panel>
}
