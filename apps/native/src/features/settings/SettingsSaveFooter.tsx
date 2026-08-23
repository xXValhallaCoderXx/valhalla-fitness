import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function SettingsSaveFooter({
  visible,
  isSaving,
  hasValidationErrors,
  error,
  onDiscard,
  onSave,
}: {
  visible: boolean
  isSaving: boolean
  hasValidationErrors: boolean
  error: string | null
  onDiscard: () => void
  onSave: () => void
}) {
  const insets = useSafeAreaInsets()
  if (!visible) return null

  return (
    <Panel
      style={{
        gap: spacing.sm,
        marginBottom: Math.max(spacing.sm, insets.bottom),
        marginHorizontal: spacing.md,
        padding: spacing.md,
      }}
    >
      <Text size="sm" weight={900}>Unsaved changes</Text>
      {hasValidationErrors ? (
        <Text size="sm" tone="danger">Fix the highlighted strength estimates before saving.</Text>
      ) : null}
      {error ? <Text size="sm" tone="danger">{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Discard"
          variant="default"
          style={{ flex: 1 }}
          disabled={isSaving}
          onPress={onDiscard}
        />
        <Button
          label={error ? 'Retry save' : 'Save changes'}
          style={{ flex: 1 }}
          disabled={hasValidationErrors}
          loading={isSaving}
          onPress={onSave}
          testID="settings-save"
        />
      </View>
    </Panel>
  )
}
