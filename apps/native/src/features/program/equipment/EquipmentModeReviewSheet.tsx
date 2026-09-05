import { View } from 'react-native'
import { ArrowRight, Dumbbell } from 'lucide-react-native'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
} from '@sheetless/domain/program/types'
import { Badge, Button, Caption, Panel, SectionLabel, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export type EquipmentModeReviewRow = {
  choice: FreeWeightChoiceDraft
  sessionTitle: string
  phaseLabel: string
  sourceMovementName: string
  replacementMovementName: string
  alternatives: Array<{
    movementId: string
    movementName: string
    policyRuleId: string
  }>
}

export type EquipmentModeUnresolvedRow = {
  sourceMovementName: string
  sessionTitle?: string
  phaseLabel?: string
}

export type EquipmentModeReviewSheetProps = {
  open: boolean
  targetMode: ProgramEquipmentMode
  rows: EquipmentModeReviewRow[]
  choices: FreeWeightChoiceDraft[]
  unresolved?: EquipmentModeUnresolvedRow[]
  unresolvedCount?: number
  canApply: boolean
  isPending?: boolean
  error?: string | null
  onChoiceChange: (
    choice: FreeWeightChoiceDraft,
    replacementMovementId: string,
  ) => void
  onClose: () => void
  onConfirm: () => void
}

/** Presentation-only equipment review shared by setup and active-program conversion. */
export function EquipmentModeReviewSheet({
  open,
  targetMode,
  rows,
  choices,
  unresolved = [],
  unresolvedCount,
  canApply,
  isPending = false,
  error,
  onChoiceChange,
  onClose,
  onConfirm,
}: EquipmentModeReviewSheetProps) {
  const { theme } = useTokens()
  const enabling = targetMode === 'free_weight'
  const title = enabling ? 'Use free weights only?' : 'Use all equipment?'
  const effectiveUnresolvedCount = Math.max(
    unresolved.length,
    unresolvedCount ?? 0,
  )

  return (
    <SheetModal
      open={open}
      title={title}
      subtitle={enabling
        ? 'Review replacements across every future phase.'
        : 'Review the automatic replacements that will be removed.'}
      closeDisabled={isPending}
      onClose={onClose}
      testID="equipment-mode-review-sheet"
      footer={(
        <View style={{ gap: spacing.xs }}>
          {error ? <Text size="sm" tone="danger">{error}</Text> : null}
          <View style={{ gap: spacing.xs }}>
            <Button
              label={enabling ? 'Use free weights only' : 'Use all equipment'}
              fullWidth
              loading={isPending}
              disabled={!canApply}
              style={{ minHeight: 44 }}
              onPress={onConfirm}
              testID="confirm-equipment-mode"
            />
            <Button
              label="Cancel"
              variant="default"
              fullWidth
              disabled={isPending}
              style={{ minHeight: 44 }}
              onPress={onClose}
            />
          </View>
        </View>
      )}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
          <Dumbbell color={theme.text} size={19} />
          <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
            <Text weight={900}>{enabling ? 'Free weights only' : 'All equipment'}</Text>
            <Caption>
              {enabling
                ? 'Replacement loads start blank. Reps and effort targets stay intact, and completed workout history does not change.'
                : 'Automatic free-weight replacements are removed. Manual programme customizations stay in place.'}
            </Caption>
          </View>
        </View>

        {effectiveUnresolvedCount > 0 ? (
          <Panel
            surface="inset"
            style={{
              backgroundColor: theme.tones.danger.soft,
              borderColor: theme.tones.danger.border,
              padding: spacing.sm,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text size="sm" tone="danger" weight={700}>
                {effectiveUnresolvedCount} movement{effectiveUnresolvedCount === 1 ? '' : 's'} do not have a safe free-weight replacement.
              </Text>
              {unresolved.map((item, index) => (
                <Caption key={`${item.sourceMovementName}:${item.phaseLabel ?? ''}:${index}`} tone="danger">
                  {item.sourceMovementName}
                  {item.sessionTitle ? ` · ${item.sessionTitle}` : ''}
                  {item.phaseLabel ? ` · ${item.phaseLabel}` : ''}
                </Caption>
              ))}
            </View>
          </Panel>
        ) : null}

        {!rows.length && effectiveUnresolvedCount === 0 ? (
          <Panel surface="inset" style={{ gap: 4, padding: spacing.md }}>
            <Text size="sm" weight={800}>
              {enabling ? 'No replacements needed' : 'No replacements to remove'}
            </Text>
            <Caption>
              {enabling
                ? 'The mode still keeps future workout swaps and added exercises free-weight-only.'
                : 'Future workout swaps and added exercises can use all saved equipment again.'}
            </Caption>
          </Panel>
        ) : rows.map((row) => {
          const selected = choices.find((choice) => sameChoice(choice, row.choice)) ?? row.choice
          const selectedName = row.alternatives.find(
            (alternative) => alternative.movementId === selected.replacementMovementId,
          )?.movementName ?? row.replacementMovementName
          const fromName = enabling ? row.sourceMovementName : selectedName
          const toName = enabling ? selectedName : row.sourceMovementName

          return (
            <Panel
              key={choiceKey(row.choice)}
              surface="inset"
              style={{ gap: spacing.sm, padding: spacing.sm }}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Badge>{row.sessionTitle}</Badge>
                <Badge tone="action">{row.phaseLabel}</Badge>
                {addedAccessoryLabel(row.choice.slotId) ? (
                  <Badge>{addedAccessoryLabel(row.choice.slotId)}</Badge>
                ) : null}
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
                <Text size="sm" weight={700} style={{ flex: 1 }}>{fromName}</Text>
                <ArrowRight color={theme.textMuted} size={15} />
                <Text size="sm" weight={900} style={{ flex: 1 }} align="right">{toName}</Text>
              </View>

              {enabling && row.alternatives.length > 1 ? (
                <View style={{ gap: spacing.xs }}>
                  <SectionLabel>Free-weight equivalent</SectionLabel>
                  {row.alternatives.map((alternative) => {
                    const isSelected = alternative.movementId === selected.replacementMovementId
                    return (
                      <Button
                        key={alternative.movementId}
                        label={alternative.movementName}
                        variant={isSelected ? 'filled' : 'default'}
                        selected={isSelected}
                        fullWidth
                        disabled={isPending}
                        style={{ minHeight: 44 }}
                        accessibilityLabel={`Use ${alternative.movementName} for ${row.sourceMovementName} in ${row.sessionTitle}, ${row.phaseLabel}`}
                        onPress={() => onChoiceChange(row.choice, alternative.movementId)}
                      />
                    )
                  })}
                </View>
              ) : null}
            </Panel>
          )
        })}
      </View>
    </SheetModal>
  )
}

function sameChoice(left: FreeWeightChoiceDraft, right: FreeWeightChoiceDraft) {
  return choiceKey(left) === choiceKey(right)
}

function choiceKey(choice: FreeWeightChoiceDraft) {
  return [
    choice.templateSessionId,
    choice.slotId,
    choice.phaseKey,
    choice.role,
  ].join(':')
}

function addedAccessoryLabel(slotId: string) {
  const match = slotId.match(/added-accessory-(\d+)-/)
  return match ? `Added accessory ${match[1]}` : null
}
