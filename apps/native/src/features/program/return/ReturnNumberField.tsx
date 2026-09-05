import { useState } from 'react'
import { View } from 'react-native'
import { Caption, TextInput } from '@/components'

export function ReturnNumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState({ value, text: value === null ? '' : String(value) })
  return (
    <View style={{ gap: 4 }}>
      <Caption>{label}</Caption>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        editable={!disabled}
        value={draft.value === value ? draft.text : value === null ? '' : String(value)}
        onChangeText={(text) => {
          const parsed = text.trim() === '' ? null : Number(text.replace(',', '.'))
          const next = parsed !== null && !Number.isFinite(parsed) ? null : parsed
          setDraft({ value: next, text })
          onChange(next)
        }}
      />
    </View>
  )
}
