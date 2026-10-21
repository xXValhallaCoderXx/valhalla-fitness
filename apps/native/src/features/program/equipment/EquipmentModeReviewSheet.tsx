import { useState } from 'react'
import { View } from 'react-native'
import { ArrowRight } from 'lucide-react-native'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
} from '@sheetless/domain/program/types'
import { Button, Caption, Panel, SectionLabel, SheetModal, Text } from '@/components'
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
  context?: 'setup' | 'plan'
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
  context = 'setup',
  onChoiceChange,
  onClose,
  onConfirm,
}: EquipmentModeReviewSheetProps) {
  const { theme } = useTokens()
  const [expanded, setExpanded] = useState(false)
  const enabling = targetMode === 'free_weight'
  const title = context === 'plan'
    ? enabling ? 'Switch to free weights only?' : 'Switch to all equipment?'
    : enabling ? 'Use free weights only?' : 'Use all equipment?'
  const effectiveUnresolvedCount = Math.max(
    unresolved.length,
    unresolvedCount ?? 0,
  )

  return (
    <SheetModal
      open={open}
      title={title}
      showHandle
      subtitle={enabling
        ? `${rows.length} replacement${rows.length === 1 ? '' : 's'} across future phases. Nothing you swapped by hand changes.`
        : `${rows.length} replacement${rows.length === 1 ? '' : 's'} will be removed. Nothing you swapped by hand changes.`}
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
              label={context === 'plan' ? enabling ? 'Keep all equipment' : 'Keep free weights only' : 'Cancel'}
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
        ) : (expanded ? rows : rows.slice(0, 4)).map((row) => {
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
              <SectionLabel>{row.sessionTitle} · {row.phaseLabel}{addedAccessoryLabel(row.choice.slotId)
                ? ` · ${addedAccessoryLabel(row.choice.slotId)}` : ''}</SectionLabel>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.xs }}>
                <Text size="sm" tone="dimmed" style={{ flex: 1 }}>{fromName}</Text>
                <ArrowRight color={theme.textMuted} size={15} />
                <Text size="sm" weight={900} style={{ flex: 1 }} align="right">{toName}</Text>
              </View>
              <Caption>{enabling ? 'Loads start blank — reps and effort stay as planned.'
                : 'The original prescription resumes. Replacement loads are not carried across.'}</Caption>

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
        {rows.length > 4 ? <Button
          label={expanded ? 'Show fewer changes' : `${rows.length - 4} more change${rows.length - 4 === 1 ? '' : 's'}`}
          variant="subtle" size="sm" style={{ paddingHorizontal: 0 }}
          onPress={() => setExpanded((value) => !value)} /> : null}
        <Caption>Completed workout history stays as it was logged.</Caption>
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
