import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import type { MovementSwapOption, SwapScope } from '@sheetless/domain/movement/types'
import type { MovementSlot, SubstitutionReason } from '@sheetless/domain/session/types'
import {
  canUseMovementSwapPhaseScope,
} from '@sheetless/domain/session/movement-swap-options'
import { substitutionReasons } from '@sheetless/domain/session/live-session-utils'
import { Badge, Button, Caption, Panel, SectionLabel, SheetModal, Text, TextInput } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { MovementPicker } from '../movement-picker/MovementPickerSheet'

export type MovementSwapDraft = {
  option: MovementSwapOption
  reason: SubstitutionReason
  note?: string
  scope: SwapScope
}

export interface MovementSwapSheetProps {
  open: boolean
  movement: MovementSlot
  options: readonly MovementSwapOption[]
  isAdHoc: boolean
  phaseLabel: string
  isLoading?: boolean
  loadError?: string | null
  isPending?: boolean
  mutationError?: string | null
  onRetry?: () => void
  onClose: () => void
  onSubmit: (draft: MovementSwapDraft) => void
}

/** Presentation-only swap flow; the owner provides options and performs the mutation. */
export function MovementSwapSheet({
  open,
  movement,
  options,
  isAdHoc,
  phaseLabel,
  isLoading = false,
  loadError,
  isPending = false,
  mutationError,
  onRetry,
  onClose,
  onSubmit,
}: MovementSwapSheetProps) {
  const { theme } = useTokens()
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null)
  const [reason, setReason] = useState<SubstitutionReason>('equipment_missing')
  const [note, setNote] = useState('')
  const [scope, setScope] = useState<SwapScope>('session')

  useEffect(() => {
    if (!open) return
    setSelectedMovementId(null)
    setReason('equipment_missing')
    setNote('')
    setScope('session')
  }, [movement.id, open])

  const selectedOption = useMemo(
    () => options.find((option) => option.movementId === selectedMovementId) ?? null,
    [options, selectedMovementId],
  )
  const canUsePhaseScope = canUseMovementSwapPhaseScope({
    option: selectedOption,
    isAdHoc,
    isAdded: Boolean(movement.isAdded),
  })
  const effectiveScope: SwapScope = scope === 'phase_slot' && canUsePhaseScope ? 'phase_slot' : 'session'
  const performedName = movement.performedMovementName ?? movement.movementName
  const isAlreadySwapped = movement.performedMovementId && movement.performedMovementId !== movement.movementId

  const submit = () => {
    if (!selectedOption || isPending) return
    onSubmit({
      option: selectedOption,
      reason,
      note: note.trim() || undefined,
      scope: effectiveScope,
    })
  }

  return (
    <SheetModal
      open={open}
      title="Swap movement"
      subtitle="Choose an allowed alternative before logging any sets."
      closeDisabled={isPending}
      scroll={false}
      onClose={onClose}
      testID="movement-swap-sheet"
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
              label="Swap movement"
              fullWidth
              loading={isPending}
              disabled={!selectedOption}
              style={{ flex: 1, minHeight: 44 }}
              onPress={submit}
              testID="confirm-movement-swap"
            />
          </View>
        </View>
      )}
    >
      <MovementPicker
        key={`${open ? 'open' : 'closed'}-${movement.id}`}
        options={options}
        selectedMovementId={selectedMovementId}
        onSelectMovement={setSelectedMovementId}
        isPending={isLoading}
        error={loadError}
        onRetry={onRetry}
        disabled={isPending}
        searchPlaceholder="Search alternatives"
        emptyMessage="No allowed alternatives match this search."
        maxListHeight={680}
        header={(
          <Panel surface="inset" style={{ gap: 4, padding: spacing.md }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <SectionLabel>Planned</SectionLabel>
              <Badge tone={movement.role === 'main' ? 'accent' : 'neutral'}>{movement.role}</Badge>
            </View>
            <Text weight={900}>{movement.movementName}</Text>
            {isAlreadySwapped ? <Caption tone="warning">Currently performed as {performedName}</Caption> : null}
            <Caption>{movement.targetSummary}</Caption>
          </Panel>
        )}
        footer={(
          <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
            <View style={{ gap: 3 }}>
              <SectionLabel>Swap details</SectionLabel>
              <Caption>Record why the movement changed and how long the change should last.</Caption>
            </View>

            <View style={{ gap: 4 }}>
              <Text size="sm" weight={700}>Reason</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {substitutionReasons.map((item) => (
                  <Button
                    key={item.value}
                    label={item.label}
                    variant={reason === item.value ? 'filled' : 'default'}
                    selected={reason === item.value}
                    disabled={isPending}
                    style={{ minHeight: 44, paddingHorizontal: spacing.sm }}
                    onPress={() => setReason(item.value)}
                  />
                ))}
              </View>
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

            {!isAdHoc ? (
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
                    disabled={isPending || !canUsePhaseScope}
                    style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
                    onPress={() => setScope('phase_slot')}
                  />
                </View>
                {!canUsePhaseScope && selectedOption ? (
                  <Caption style={{ color: theme.textMuted }}>
                    This alternative is available for the current session only.
                  </Caption>
                ) : null}
              </View>
            ) : (
              <Caption>Ad-hoc workout swaps apply to this workout only.</Caption>
            )}
          </Panel>
        )}
      />
    </SheetModal>
  )
}
