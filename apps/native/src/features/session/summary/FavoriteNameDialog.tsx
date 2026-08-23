import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { AD_HOC_TITLE_MAX_LENGTH } from '@sheetless/domain/session/ad-hoc'
import { Caption, ConfirmDialog, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'

export function FavoriteNameDialog({
  open,
  initialTitle,
  isPending,
  error,
  onCancel,
  onSave,
}: {
  open: boolean
  initialTitle: string
  isPending: boolean
  error?: string | null
  onCancel: () => void
  onSave: (title: string) => void
}) {
  const [title, setTitle] = useState(initialTitle)

  useEffect(() => {
    if (open) setTitle(initialTitle)
  }, [initialTitle, open])

  const trimmed = title.trim()

  return (
    <ConfirmDialog
      open={open}
      title="Name this favourite"
      confirmLabel="Save favourite"
      confirmDisabled={!trimmed}
      isPending={isPending}
      error={error}
      onCancel={onCancel}
      onConfirm={() => {
        if (trimmed) onSave(trimmed)
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={AD_HOC_TITLE_MAX_LENGTH}
          placeholder="e.g. Push day"
          accessibilityLabel="Favourite name"
          autoCapitalize="sentences"
          autoFocus
          editable={!isPending}
          onSubmitEditing={() => {
            if (trimmed && !isPending) onSave(trimmed)
          }}
        />
        <Caption>The name appears with your favourites on the Programs tab.</Caption>
      </View>
    </ConfirmDialog>
  )
}
