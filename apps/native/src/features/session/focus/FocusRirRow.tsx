/** Native port of web FocusRirRow: large 0/1/2/3+ reps-in-reserve picker. */
import { View } from 'react-native'
import { RIR_OPTIONS } from '@sheetless/domain/session/live-session-utils'
import { Caption, SegmentedControl } from '@/components'
import { spacing } from '@/lib/tokens'
import { useExperienceMode } from '@/lib/experience-mode'
import { FocusStepper } from './FocusStepper'

export function FocusRirRow({
  value,
  onChange,
  disabled = false,
  targetRir,
}: {
  value?: number
  onChange: (value: number) => void
  disabled?: boolean
  targetRir?: number | null
}) {
  const { isFull } = useExperienceMode()
  if ((targetRir ?? 0) > 3) {
    return (
      <FocusStepper
        label={isFull ? 'Actual reps in reserve' : 'Reps left after this set'}
        value={value ?? null}
        step={1}
        disabled={disabled}
        onAdjust={(delta) => onChange(Math.max(0, Math.min(10, (value ?? 0) + delta)))}
        onType={(next) => onChange(Math.max(0, Math.min(10, next)))}
      />
    )
  }
  return (
    <View>
      <Caption>{isFull ? 'Reps in reserve (RIR)' : 'How many more reps could you do?'}</Caption>
      <SegmentedControl
        accessibilityRole="radiogroup"
        accessibilityLabel="Actual reps in reserve"
        variant="segments"
        options={RIR_OPTIONS.map((option) => ({
          value: String(option.value),
          label: isFull ? option.label : option.value === 0 ? 'None' : `${option.label} left`,
          accessibilityLabel: `${option.value === 3 ? '3 or more' : option.value} ${option.value === 1 ? 'rep' : 'reps'} in reserve`,
        }))}
        value={value == null ? null : String(Math.min(value, 3))}
        disabled={disabled}
        onChange={(next) => onChange(Number(next))}
        style={{ marginTop: spacing.xs }}
      />
    </View>
  )
}
