import { AppButton } from '@/components/AppButton'
import { useAppTheme } from '@/theme/useAppTheme'
import { formatNumber, roundToStep, seedLoadForSet, seedRepsForSet, type MovementSlot, type SetLog } from '@sheetless/core'
import { radius, spacing, typography } from '@sheetless/tokens'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { NumericStepper } from './NumericStepper'

export type SetDraft = {
  actualLoad: number
  actualReps: number
  actualRir: number | null
}

type Props = {
  movement: MovementSlot
  set: SetLog
  units: string
  rounding: number
  saving: boolean
  failureMessage: string | null
  onSave: (draft: SetDraft) => void
  onRetry: () => void
}

function parseNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function SetLogger({ movement, set, units, rounding, saving, failureMessage, onSave, onRetry }: Props) {
  const { colors } = useAppTheme()
  const [load, setLoad] = useState(formatNumber(seedLoadForSet(movement, set)))
  const [reps, setReps] = useState(formatNumber(seedRepsForSet(movement, set)))
  const [rir, setRir] = useState<number | null>(set.actualRir ?? set.targetRir ?? null)
  const previous = movement.previous?.sets?.find((item) => item.setIndex === set.setIndex)

  const stepLoad = (direction: number) => {
    setLoad(formatNumber(Math.max(0, roundToStep(parseNumber(load) + direction * rounding, rounding))))
  }
  const stepReps = (direction: number) => {
    setReps(String(Math.max(0, Math.round(parseNumber(reps) + direction))))
  }

  return (
    <View style={styles.logger}>
      <View style={styles.contextRow}>
        <View style={styles.contextBlock}>
          <Text style={[styles.contextLabel, { color: colors.mutedText }]}>TARGET</Text>
          <Text style={[styles.contextValue, { color: colors.text }]}>{movement.targetSummary}</Text>
        </View>
        <View style={styles.contextBlock}>
          <Text style={[styles.contextLabel, { color: colors.mutedText }]}>LAST TIME</Text>
          <Text style={[styles.contextValue, { color: colors.text }]}>
            {previous?.reps != null ? `${previous.load ? formatNumber(previous.load) : 'BW'} × ${previous.reps}` : 'No comparable set'}
          </Text>
        </View>
      </View>

      <NumericStepper label={`Load (${units})`} value={load} onChange={setLoad} onStep={stepLoad} stepLabel={formatNumber(rounding)} />
      <NumericStepper label="Reps" value={reps} onChange={setReps} onStep={stepReps} stepLabel="1" integer />

      <View style={styles.rirGroup}>
        <Text style={[styles.contextLabel, { color: colors.mutedText }]}>REPS IN RESERVE</Text>
        <View style={styles.rirRow}>
          {[0, 1, 2, 3].map((value) => {
            const active = rir === value || (value === 3 && rir != null && rir >= 3)
            return (
              <Pressable
                accessibilityLabel={value === 3 ? '3 or more reps in reserve' : `${value} reps in reserve`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={value}
                onPress={() => setRir(value)}
                style={[
                  styles.rir,
                  { backgroundColor: active ? colors.actionSoft : colors.surface2, borderColor: active ? colors.actionBorder : colors.border },
                ]}
              >
                <Text style={[styles.rirText, { color: active ? colors.actionText : colors.text }]}>{value === 3 ? '3+' : value}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <AppButton
        label={set.completed ? 'Update completed set' : 'Log completed set'}
        loading={saving}
        onPress={() => onSave({ actualLoad: parseNumber(load), actualReps: Math.round(parseNumber(reps)), actualRir: rir })}
      />
      {failureMessage ? (
        <View style={[styles.failure, { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder }]}>
          <Text accessibilityRole="alert" style={[styles.failureText, { color: colors.dangerText }]}>{failureMessage}</Text>
          <AppButton label="Retry this save" tone="danger" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  logger: { gap: 16 },
  contextRow: { flexDirection: 'row', gap: spacing.sm },
  contextBlock: { flex: 1, gap: 4 },
  contextLabel: { fontSize: typography.fontSize.xs, fontWeight: '900', letterSpacing: 0.8 },
  contextValue: { fontSize: typography.fontSize.md, fontWeight: typography.weight.strong },
  rirGroup: { gap: 8 },
  rirRow: { flexDirection: 'row', gap: 8 },
  rir: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 52 },
  rirText: { fontSize: 17, fontWeight: '900' },
  failure: { borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: 12 },
  failureText: { fontSize: typography.fontSize.md, fontWeight: typography.weight.strong, lineHeight: 20 },
})
