import { View } from 'react-native'
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
  if (!visible) return null

  return (
    <Panel
      style={{
        gap: spacing.sm,
        marginBottom: spacing.sm,
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
