import { View } from 'react-native'
import { Button, SheetModal, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import {
  MovementPicker,
  type MovementPickerOption,
  type MovementPickerProps,
} from './MovementPicker'

export { MovementPicker, type MovementPickerOption, type MovementPickerProps } from './MovementPicker'

export interface MovementPickerSheetProps<TOption extends MovementPickerOption = MovementPickerOption>
  extends MovementPickerProps<TOption> {
  open: boolean
  title: string
  subtitle?: string
  confirmLabel: string
  isSubmitting?: boolean
  submitError?: string | null
  onClose: () => void
  onConfirm: (option: TOption) => void
}

/** Standalone picker sheet for flows that need only an explicit movement choice. */
export function MovementPickerSheet<TOption extends MovementPickerOption>({
  open,
  title,
  subtitle,
  confirmLabel,
  options,
  selectedMovementId,
  isSubmitting = false,
  submitError,
  onClose,
  onConfirm,
  ...pickerProps
}: MovementPickerSheetProps<TOption>) {
  const selectedOption = options.find((option) => option.movementId === selectedMovementId) ?? null
  return (
    <SheetModal
      open={open}
      title={title}
      subtitle={subtitle}
      closeDisabled={isSubmitting}
      scroll={false}
      onClose={onClose}
      testID="movement-picker-sheet"
      footer={(
        <View style={{ gap: spacing.xs }}>
          {submitError ? <Text size="sm" tone="danger">{submitError}</Text> : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label="Cancel"
              variant="default"
              fullWidth
              disabled={isSubmitting}
              style={{ flex: 1, minHeight: 44 }}
              onPress={onClose}
            />
            <Button
              label={confirmLabel}
              fullWidth
              loading={isSubmitting}
              disabled={!selectedOption}
              style={{ flex: 1, minHeight: 44 }}
              onPress={() => selectedOption && onConfirm(selectedOption)}
            />
          </View>
        </View>
      )}
    >
      <MovementPicker
        key={open ? 'picker-open' : 'picker-closed'}
        {...pickerProps}
        options={options}
        selectedMovementId={selectedMovementId}
        disabled={isSubmitting || pickerProps.disabled}
      />
    </SheetModal>
  )
}
