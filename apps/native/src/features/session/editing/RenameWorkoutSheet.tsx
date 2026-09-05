import { useEffect, useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { AD_HOC_TITLE_MAX_LENGTH } from '@sheetless/domain/session/ad-hoc'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Caption, SectionLabel, SheetModal, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'
import { useRenameWorkoutMutation } from './useWorkoutIdentityMutations'

export function RenameWorkoutSheet({
  open,
  user,
  session,
  onClose,
}: {
  open: boolean
  user: User
  session: WorkoutSession
  onClose: () => void
}) {
  const [title, setTitle] = useState(session.title)
  const rename = useRenameWorkoutMutation({ user, session, onRenamed: onClose })
  const trimmed = title.trim()

  useEffect(() => {
    if (open) setTitle(session.title)
  }, [open, session.title])

  const error = rename.isError
    ? getApiErrorMessage(rename.error, 'Unable to rename this workout. Try again.')
    : null
  const save = () => {
    if (!trimmed || trimmed === session.title || rename.isPending) return
    rename.mutate(trimmed)
  }

  return (
    <SheetModal
      open={open}
      title="Name this workout"
      subtitle="Use a name that will make sense when it appears in your history."
      closeDisabled={rename.isPending}
      onClose={onClose}
      footer={(
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label="Cancel"
            variant="default"
            disabled={rename.isPending}
            style={{ flex: 1 }}
            onPress={onClose}
          />
          <Button
            label="Save name"
            loading={rename.isPending}
            disabled={!trimmed || trimmed === session.title}
            style={{ flex: 1 }}
            onPress={save}
          />
        </View>
      )}
    >
      <View style={{ gap: spacing.xs }}>
        <SectionLabel>Workout name</SectionLabel>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Push day"
          accessibilityLabel="Workout name"
          autoCapitalize="sentences"
          autoFocus
          maxLength={AD_HOC_TITLE_MAX_LENGTH}
          editable={!rename.isPending}
          returnKeyType="done"
          onSubmitEditing={save}
          testID="rename-workout-input"
        />
        <Caption>{trimmed.length}/{AD_HOC_TITLE_MAX_LENGTH} characters</Caption>
      </View>
      {error ? (
        <Text size="sm" tone="danger">
          {error}
        </Text>
      ) : null}
    </SheetModal>
  )
}
