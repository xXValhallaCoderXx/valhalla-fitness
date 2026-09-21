import { useWindowDimensions, View } from 'react-native'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { formatSetTarget, roundToStep } from '@sheetless/domain/session/live-session-utils'
import { Button, Caption, SheetModal, Text, TextInput } from '@/components'
import { fontForWeight, radii, spacing, useTokens } from '@/lib/tokens'
import { FocusRirRow } from '../focus/FocusRirRow'
import type { WorkoutLogger } from './useWorkoutLogger'

export function AdjustSetSheet({ open, onClose, session, movement, logger }: {
  open: boolean; onClose: () => void; session: WorkoutSession; movement: MovementSlot; logger: WorkoutLogger
}) {
  const { theme } = useTokens()
  const { set, input } = logger
  if (!set) return null
  return <SheetModal open={open} showHandle title="Adjust this set"
    subtitle={`${movement.performedMovementName ?? movement.movementName} · set ${movement.sets.indexOf(set) + 1} of ${movement.sets.length} · planned ${formatSetTarget(set, session.units, true, movement)}`}
    onClose={onClose} testID="adjust-set-sheet" footer={
      <Button label={logger.label === 'Log set' ? `Log ${input.load || '—'} ${session.units} × ${input.reps || '—'}` : logger.label}
        size="lg" fullWidth loading={logger.saving} disabled={logger.disabled || !logger.valid}
        onPress={() => logger.submit(logger.failed ? set.completed : true, onClose)} />
    }>
    <View style={{ backgroundColor: theme.surface2, padding: spacing.sm, gap: spacing.sm, borderRadius: radii.lg }}>
      <NumberRow label="Weight" value={input.load} unit={session.units} step={session.rounding} onChange={load => logger.edit({ load })} />
      <NumberRow label="Reps" value={input.reps} unit="reps" step={1} onChange={reps => logger.edit({ reps })} />
    </View>
    {!logger.valid ? <Caption>Enter weight (0 for bodyweight) and whole-number reps to log this set.</Caption> : null}
    <FocusRirRow value={input.rir ?? undefined} targetRir={set.targetRir} onChange={rir => logger.edit({ rir })}
      onClear={() => logger.edit({ rir: null })} />
    <Caption>Optional · record the reps you had left for this set.</Caption>
    {(set.targetRir ?? 0) > 3 && input.rir != null ? <Button label="Clear effort" size="sm" variant="subtle" onPress={() => logger.edit({ rir: null })} /> : null}
    {logger.failed ? <Text tone="danger" size="sm">Save failed. Retry with these values, or edit them first.</Text> : null}
    {set.completed ? <Button label="Mark incomplete" variant="default" disabled={logger.disabled}
      onPress={() => logger.submit(false, onClose)} /> : null}
  </SheetModal>
}

function NumberRow({ label, value, unit, step, onChange }: {
  label: string; value: string; unit?: string; step: number; onChange: (value: string) => void
}) {
  const { fontScale } = useWindowDimensions()
  const stacked = fontScale > 1.4
  const adjust = (delta: number) => {
    const number = Number(value.replace(',', '.'))
    onChange(String(Math.max(0, Number(roundToStep((Number.isFinite(number) ? number : 0) + delta, step).toFixed(6)))))
  }
  return <View style={{ gap: spacing.xs }}>
    {stacked ? <Text size="sm" weight={700}>{label}</Text> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {!stacked ? <Text size="sm" weight={700} style={{ width: 54 * Math.max(1, fontScale) }}>{label}</Text> : null}
      <Button label="−" accessibilityLabel={`Decrease ${label.toLowerCase()}`} size="sm" variant="default"
        style={{ minWidth: 44 }} onPress={() => adjust(-step)} />
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={label === 'Weight' ? 'decimal-pad' : 'number-pad'}
          containerStyle={{ flexShrink: 1, minWidth: 44 }} inputStyle={{ minHeight: 48, fontSize: 26, fontFamily: fontForWeight(800),
            fontWeight: '800', textAlign: 'center', paddingHorizontal: 2, backgroundColor: 'transparent', borderColor: 'transparent' }} />
        <Caption>{unit}</Caption>
      </View>
      <Button label="+" accessibilityLabel={`Increase ${label.toLowerCase()}`} size="sm" variant="default"
        style={{ minWidth: 44 }} onPress={() => adjust(step)} />
    </View>
  </View>
}
