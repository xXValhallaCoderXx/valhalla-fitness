import { Button, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function WorkoutCompleteBanner({
  visible,
  disabled,
  onFinish,
}: {
  visible: boolean
  disabled: boolean
  onFinish: () => void
}) {
  const { theme } = useTokens()
  if (!visible) return null

  return (
    <Panel
      style={{
        backgroundColor: theme.tones.success.soft,
        borderColor: theme.tones.success.border,
        gap: 2,
        padding: spacing.md,
      }}
    >
      <Text weight={800} style={{ color: theme.tones.success.text }}>
        All sets logged — great work.
      </Text>
      <Text size="sm" tone="dimmed">
        Finish when you're ready to wrap up and review the session.
      </Text>
      <Button
        label="Finish workout"
        fullWidth
        disabled={disabled}
        onPress={onFinish}
        testID="focus-finish-complete"
      />
    </Panel>
  )
}

export function AddSetAction({
  visible,
  disabled,
  isPending,
  error,
  onAdd,
}: {
  visible: boolean
  disabled: boolean
  isPending: boolean
  error: string | null
  onAdd: () => void
}) {
  if (!visible) return null

  return (
    <>
      <Button
        label="Add set"
        variant="default"
        fullWidth
        disabled={disabled}
        loading={isPending}
        onPress={onAdd}
      />
      {error ? (
        <Text size="sm" tone="danger">
          {error}
        </Text>
      ) : null}
    </>
  )
}
