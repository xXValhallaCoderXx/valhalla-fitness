import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import type { AccessoryMovementOption, SwapScope } from '@sheetless/domain/movement/types'
import type { AccessoryProgressionMethod } from '@sheetless/domain/program/types'
import { Badge, Button, Caption, Panel, SectionLabel, SheetModal, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'
import { MovementPicker } from '../movement-picker/MovementPickerSheet'

export type AddAccessoryDraft = {
  movement: AccessoryMovementOption
  progressionMethod: AccessoryProgressionMethod
  repTarget: string
  scope: SwapScope
  note?: string
}

export interface AddAccessorySheetProps {
  open: boolean
  options: readonly AccessoryMovementOption[]
  phaseLabel: string
  freeWeightOnly?: boolean
  allowPhaseScope?: boolean
  isLoading?: boolean
  loadError?: string | null
  isPending?: boolean
  mutationError?: string | null
  onRetry?: () => void
  onClose: () => void
  onSubmit: (draft: AddAccessoryDraft) => void
}

/** Configures and adds a non-competition accessory to a programme workout. */
export function AddAccessorySheet({
  open,
  options,
  phaseLabel,
  freeWeightOnly = false,
  allowPhaseScope = true,
  isLoading = false,
  loadError,
  isPending = false,
  mutationError,
  onRetry,
  onClose,
  onSubmit,
}: AddAccessorySheetProps) {
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null)
  const [progressionMethod, setProgressionMethod] = useState<AccessoryProgressionMethod>('history_only')
  const [repMin, setRepMin] = useState('8')
  const [repMax, setRepMax] = useState('12')
  const [scope, setScope] = useState<SwapScope>('session')
  const [note, setNote] = useState('')
  const visibleOptions = useMemo(
    () => freeWeightOnly ? options.filter((option) => option.freeWeightCompatible) : options,
    [freeWeightOnly, options],
  )
  const selectedMovement = visibleOptions.find((option) => option.movementId === selectedMovementId) ?? null
  const repTarget = buildRepTarget(repMin, repMax)
  const effectiveScope = scope === 'phase_slot' && allowPhaseScope ? 'phase_slot' : 'session'

  useEffect(() => {
    if (!open) return
    setSelectedMovementId(null)
    setProgressionMethod('history_only')
    setRepMin('8')
    setRepMax('12')
    setScope('session')
    setNote('')
  }, [open])

  const submit = () => {
    if (!selectedMovement || !repTarget.value || isPending) return
    onSubmit({
      movement: selectedMovement,
      progressionMethod,
      repTarget: repTarget.value,
      scope: effectiveScope,
      note: note.trim() || undefined,
    })
  }

  return (
    <SheetModal
      open={open}
      title="Add accessory"
      subtitle={freeWeightOnly ? 'Showing free-weight compatible accessories.' : 'Add work without changing the programme template.'}
      closeDisabled={isPending}
      scroll={false}
      onClose={onClose}
      testID="add-accessory-sheet"
      footer={(
        <View style={{ gap: spacing.xs }}>
          {mutationError ? <Text size="sm" tone="danger">{mutationError}</Text> : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label="Cancel"
              variant="default"
              fullWidth
              disabled={isPending}
              style={{ flex: 1, minHeight: 44 }}
              onPress={onClose}
            />
            <Button
              label="Add accessory"
              fullWidth
              loading={isPending}
              disabled={!selectedMovement || !repTarget.value}
              style={{ flex: 1, minHeight: 44 }}
              onPress={submit}
              testID="confirm-add-accessory"
            />
          </View>
        </View>
      )}
    >
      <MovementPicker
        key={open ? 'add-accessory-open' : 'add-accessory-closed'}
        options={visibleOptions}
        selectedMovementId={selectedMovementId}
        onSelectMovement={setSelectedMovementId}
        isPending={isLoading}
        error={loadError}
        onRetry={onRetry}
        disabled={isPending}
        searchPlaceholder="Search accessory movements"
        emptyMessage="No compatible accessories match this search."
        maxListHeight={680}
        footer={(
          <Panel surface="inset" style={{ gap: spacing.md, padding: spacing.md }}>
            <View style={{ gap: 4 }}>
              <SectionLabel>Progression</SectionLabel>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Button
                  label="History only"
                  variant={progressionMethod === 'history_only' ? 'filled' : 'default'}
                  selected={progressionMethod === 'history_only'}
                  disabled={isPending}
                  style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
                  onPress={() => setProgressionMethod('history_only')}
                />
                <Button
                  label="Double progression"
                  variant={progressionMethod === 'double_progression' ? 'filled' : 'default'}
                  selected={progressionMethod === 'double_progression'}
                  disabled={isPending}
                  style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
                  onPress={() => setProgressionMethod('double_progression')}
                />
              </View>
              <Caption>
                {progressionMethod === 'history_only'
                  ? 'Track the exercise without automatic load recommendations.'
                  : 'Increase load after all sets reach the top of the rep range.'}
              </Caption>
            </View>

            <View style={{ gap: 4 }}>
              <SectionLabel>Rep range</SectionLabel>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput
                  accessibilityLabel="Minimum reps"
                  value={repMin}
                  onChangeText={(value) => setRepMin(sanitizeReps(value))}
                  placeholder="8"
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!isPending}
                  containerStyle={{ flex: 1 }}
                  inputStyle={{ minHeight: 44 }}
                />
                <TextInput
                  accessibilityLabel="Maximum reps"
                  value={repMax}
                  onChangeText={(value) => setRepMax(sanitizeReps(value))}
                  placeholder="12"
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!isPending}
                  containerStyle={{ flex: 1 }}
                  inputStyle={{ minHeight: 44 }}
                />
              </View>
              {repTarget.error ? <Caption tone="danger">{repTarget.error}</Caption> : null}
            </View>

            <View style={{ gap: 4 }}>
              <Text size="sm" weight={700}>Note</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Optional"
                maxLength={2_000}
                editable={!isPending}
                inputStyle={{ minHeight: 44 }}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text size="sm" weight={700}>Apply to</Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Button
                  label="This session"
                  variant={effectiveScope === 'session' ? 'filled' : 'default'}
                  selected={effectiveScope === 'session'}
                  disabled={isPending}
                  style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
                  onPress={() => setScope('session')}
                />
                <Button
                  label={phaseLabel}
                  variant={effectiveScope === 'phase_slot' ? 'filled' : 'default'}
                  selected={effectiveScope === 'phase_slot'}
                  disabled={isPending || !allowPhaseScope}
                  style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
                  onPress={() => setScope('phase_slot')}
                />
              </View>
            </View>

            <Panel style={{ gap: 3, padding: spacing.sm }}>
              <SectionLabel>Selected</SectionLabel>
              <Text size="sm" weight={900}>{selectedMovement?.movementName ?? 'No movement selected'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Badge>{repTarget.value || 'No reps'} reps</Badge>
                <Badge>{progressionMethod === 'history_only' ? 'History only' : 'Double progression'}</Badge>
                <Badge>{effectiveScope === 'session' ? 'This session' : phaseLabel}</Badge>
              </View>
            </Panel>
          </Panel>
        )}
      />
    </SheetModal>
  )
}

function sanitizeReps(value: string) {
  return value.replace(/\D/g, '').slice(0, 3)
}

function buildRepTarget(repMin: string, repMax: string): { value: string; error?: string } {
  const minimumInput = repMin.trim()
  const maximumInput = repMax.trim()
  if (!minimumInput && !maximumInput) return { value: '', error: 'Enter a rep target.' }
  const minimum = Number(minimumInput || maximumInput)
  const maximum = Number(maximumInput || minimumInput)
  if (!validRepBound(minimum) || !validRepBound(maximum)) {
    return { value: '', error: 'Use whole-number reps from 1 to 100.' }
  }
  if (maximum < minimum) return { value: '', error: 'Maximum reps must be at least minimum reps.' }
  return { value: minimum === maximum ? String(minimum) : `${minimum}-${maximum}` }
}

function validRepBound(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 100
}
