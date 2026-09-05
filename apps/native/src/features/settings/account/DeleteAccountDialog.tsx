import { useEffect, useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import {
  ACCOUNT_DELETE_CONFIRMATION,
  isAccountDeleteConfirmed,
} from '@sheetless/domain/account/data-rights'
import { Button, Caption, Heading, Text, TextInput } from '@/components'
import { cardShadow, radii, spacing, useTokens } from '@/lib/tokens'

export function DeleteAccountDialog({
  open,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean
  isPending: boolean
  error: string | null
  onClose: () => void
  onConfirm: (confirmation: string) => void
}) {
  const { theme } = useTokens()
  const [confirmation, setConfirmation] = useState('')
  const confirmed = isAccountDeleteConfirmed(confirmation)

  useEffect(() => {
    if (!open) setConfirmation('')
  }, [open])

  const close = () => {
    if (isPending) return
    setConfirmation('')
    onClose()
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        accessible={false}
        onPress={isPending ? undefined : close}
        style={{
          backgroundColor: 'rgba(6, 12, 14, 0.65)',
          flex: 1,
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <Pressable accessible={false} onPress={() => {}} style={{ cursor: 'auto' }}>
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.tones.danger.border,
              borderRadius: radii.lg,
              borderWidth: 1,
              gap: spacing.sm,
              padding: spacing.lg,
              ...cardShadow(theme),
            }}
          >
            <Heading order={2}>Delete your Sheetless account?</Heading>
            <Text size="sm" tone="dimmed">
              This permanently removes your sign-in identity, profile, programmes, workout history,
              set logs, decisions, bodyweight entries, and feedback. It cannot be undone.
            </Text>
            <Caption>
              Export first if you want a copy. Enter {ACCOUNT_DELETE_CONFIRMATION} exactly to continue.
            </Caption>
            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder={ACCOUNT_DELETE_CONFIRMATION}
              editable={!isPending}
              autoCapitalize="characters"
              autoComplete="off"
              testID="delete-account-confirmation"
            />
            {error ? <Text size="sm" tone="danger">{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Keep account"
                variant="default"
                style={{ flex: 1 }}
                disabled={isPending}
                onPress={close}
              />
              <Button
                label="Delete forever"
                tone="danger"
                style={{ flex: 1 }}
                disabled={!confirmed}
                loading={isPending}
                onPress={() => onConfirm(confirmation)}
                testID="delete-account-submit"
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
