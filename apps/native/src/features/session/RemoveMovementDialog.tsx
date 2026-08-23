import { useEffect, useState } from 'react'
import { View } from 'react-native'
import type { SwapScope } from '@sheetless/domain/movement/types'
import { Button, Caption, ConfirmDialog, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export interface RemoveMovementDialogProps {
  open: boolean
  movementName: string
  kind: 'ad_hoc' | 'added_accessory'
  allowPhaseScope?: boolean
  phaseLabel?: string
  isPending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (scope: SwapScope) => void
}

/** Destructive confirmation for only those movements the workout permits users to remove. */
export function RemoveMovementDialog({
  open,
  movementName,
  kind,
  allowPhaseScope = false,
  phaseLabel = 'Rest of this phase',
  isPending = false,
  error,
  onClose,
  onConfirm,
}: RemoveMovementDialogProps) {
  const { theme } = useTokens()
  const [scope, setScope] = useState<SwapScope>('session')

  useEffect(() => {
    if (open) setScope('session')
  }, [open, movementName])

  const isAccessory = kind === 'added_accessory'
  const effectiveScope = isAccessory && allowPhaseScope ? scope : 'session'

  return (
    <ConfirmDialog
      open={open}
      title={`Remove ${movementName}?`}
      confirmLabel={effectiveScope === 'phase_slot' ? 'Remove from phase' : 'Remove movement'}
      cancelLabel="Keep movement"
      tone="danger"
      isPending={isPending}
      error={error}
      onCancel={onClose}
      onConfirm={() => onConfirm(effectiveScope)}
    >
      <View style={{ gap: spacing.sm }}>
        <Text size="sm" tone="dimmed">
          {isAccessory
            ? 'This removes the accessory and permanently deletes any sets already logged for it in this workout.'
            : 'This permanently removes the exercise and all of its logged sets from this one-off workout.'}
        </Text>

        {isAccessory && allowPhaseScope ? (
          <View style={{ gap: 4 }}>
            <Text size="sm" weight={700}>Remove from</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Button
                label="This session"
                variant={scope === 'session' ? 'filled' : 'default'}
                selected={scope === 'session'}
                disabled={isPending}
                style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
                onPress={() => setScope('session')}
              />
              <Button
                label={phaseLabel}
                variant={scope === 'phase_slot' ? 'filled' : 'default'}
                selected={scope === 'phase_slot'}
                disabled={isPending}
                style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
                onPress={() => setScope('phase_slot')}
              />
            </View>
            {scope === 'phase_slot' ? (
              <Caption style={{ color: theme.tones.danger.text }}>
                Future appearances of this manually added accessory in the phase will also be removed.
              </Caption>
            ) : null}
          </View>
        ) : null}
      </View>
    </ConfirmDialog>
  )
}
