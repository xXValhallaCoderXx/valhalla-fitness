import { View } from 'react-native'
import { Caption, TextInput } from '@/components'

export function ReturnNumberField({
  label,
  value,
  onChange,
  disabled,
  suffix,
  minimum = 0,
  maximum = 99999,
  integer = false,
  optional = false,
  positive = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  suffix?: string
  minimum?: number
  maximum?: number
  integer?: boolean
  optional?: boolean
  positive?: boolean
}) {
  const numeric = Number(value.replace(',', '.'))
  const empty = !value.trim()
  const error = empty && optional ? null : empty || !Number.isFinite(numeric)
    ? 'Enter a number.'
    : positive && numeric <= 0 ? 'Enter a number greater than zero.'
      : numeric < minimum || numeric > maximum ? `Enter a value from ${minimum} to ${maximum}.`
        : integer && !Number.isInteger(numeric) ? 'Enter a whole number.' : null
  return (
    <View style={{ flex: 1, minWidth: 135, gap: 4 }}>
      <Caption>{label}{suffix ? ` · ${suffix}` : ''}</Caption>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        editable={!disabled}
        value={value}
        onChangeText={onChange}
        inputStyle={{ minHeight: 48 }}
        error={error}
      />
    </View>
  )
}
