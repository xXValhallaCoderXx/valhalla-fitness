import { AppButton } from '@/components/AppButton'
import { useAppTheme } from '@/theme/useAppTheme'
import { radius } from '@sheetless/tokens'
import { StyleSheet, Text, TextInput, View } from 'react-native'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  onStep: (delta: number) => void
  stepLabel: string
  integer?: boolean
}

export function NumericStepper({ label, value, onChange, onStep, stepLabel, integer }: Props) {
  const { colors } = useAppTheme()
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text>
      <View style={styles.row}>
        <AppButton accessibilityLabel={`Decrease ${label}`} label={`−${stepLabel}`} tone="secondary" onPress={() => onStep(-1)} style={styles.step} />
        <TextInput
          accessibilityLabel={label}
          keyboardType={integer ? 'number-pad' : 'decimal-pad'}
          onChangeText={onChange}
          selectTextOnFocus
          style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}
          value={value}
        />
        <AppButton accessibilityLabel={`Increase ${label}`} label={`+${stepLabel}`} tone="secondary" onPress={() => onStep(1)} style={styles.step} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  step: { flex: 1, minHeight: 50, paddingHorizontal: 4 },
  input: { borderRadius: radius.md, borderWidth: 1, fontSize: 22, fontWeight: '800', minHeight: 54, textAlign: 'center', width: 92 },
})
