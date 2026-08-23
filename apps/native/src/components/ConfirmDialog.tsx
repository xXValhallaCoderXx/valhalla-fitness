/** Native mirror of the web ConfirmDialog: RN Modal styled as a centered card. */
import { Modal, Pressable, View } from 'react-native'
import { Button } from './Button'
import { Heading } from './Heading'
import { Text } from './Text'
import { cardShadow, radii, spacing, useTokens } from '@/lib/tokens'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  children: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** Tone of the confirm button; 'danger' for destructive actions. */
  tone?: 'action' | 'danger'
  isPending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'action',
  isPending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { theme } = useTokens()
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={isPending ? undefined : onCancel}
        style={{
          backgroundColor: 'rgba(6, 12, 14, 0.55)',
          flex: 1,
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        {/* Inner pressable swallows taps so only the backdrop dismisses. */}
        <Pressable onPress={() => {}} style={{ cursor: 'auto' }}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
              borderRadius: radii.lg,
              borderWidth: 1,
              gap: spacing.sm,
              padding: spacing.lg,
              ...cardShadow(theme),
            }}
          >
            <Heading order={3}>{title}</Heading>
            {typeof children === 'string' ? (
              <Text size="sm" tone="dimmed">
                {children}
              </Text>
            ) : (
              children
            )}
            {error ? (
              <Text size="sm" tone="danger">
                {error}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Button label={cancelLabel} variant="default" fullWidth disabled={isPending} onPress={onCancel} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={confirmLabel}
                  tone={tone}
                  fullWidth
                  loading={isPending}
                  onPress={onConfirm}
                  testID="confirm-dialog-confirm"
                />
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
