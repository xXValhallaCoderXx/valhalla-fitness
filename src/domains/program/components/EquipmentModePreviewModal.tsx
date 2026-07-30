import { Badge, Button, Modal, Select } from '@mantine/core'
import { ArrowRight, Dumbbell } from 'lucide-react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
} from '~/domains/program'

export type EquipmentModePreviewRow = {
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

export function EquipmentModePreviewModal({
  opened,
  targetMode,
  rows,
  choices,
  unresolvedCount,
  canApply = unresolvedCount === 0,
  isPending = false,
  error,
  onChoiceChange,
  onClose,
  onConfirm,
}: {
  opened: boolean
  targetMode: ProgramEquipmentMode
  rows: EquipmentModePreviewRow[]
  choices: FreeWeightChoiceDraft[]
  unresolvedCount: number
  canApply?: boolean
  isPending?: boolean
  error?: string | null
  onChoiceChange: (
    choice: FreeWeightChoiceDraft,
    replacementMovementId: string,
  ) => void
  onClose: () => void
  onConfirm: () => void
}) {
  const enabling = targetMode === 'free_weight'

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={enabling ? 'Use free weights only?' : 'Use all equipment?'}
      size="lg"
      centered
    >
      <div className="grid gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Dumbbell size={18} />
            <Text fw={800}>
              {enabling ? 'Free weights only' : 'All equipment'}
            </Text>
          </div>
          <Caption mt={4} lh={1.5}>
            {enabling
              ? 'These replacements cover every future phase. Replacement loads start blank, while reps and effort targets stay intact. Completed workouts and their history stay unchanged.'
              : 'Automatic free-weight replacements will be removed. Your manual programme customizations remain.'}
          </Caption>
        </div>

        {unresolvedCount ? (
          <Panel surface="inset" p="sm">
            <Text tone="danger" fw={700}>
              {unresolvedCount} movement
              {unresolvedCount === 1 ? '' : 's'} do not have a reviewed
              free-weight replacement.
            </Text>
          </Panel>
        ) : null}

        {!rows.length ? (
          <Panel surface="inset" p="md">
            <Text fw={700}>No replacements needed</Text>
            <Caption mt={4}>
              The mode still keeps future workout swaps and added exercises
              free-weight-only.
            </Caption>
          </Panel>
        ) : (
          <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1">
            {rows.map((row) => {
              const slotLabel = equipmentModeSlotLabel(row.choice.slotId)
              const selected =
                choices.find(
                  (choice) =>
                    choice.templateSessionId ===
                      row.choice.templateSessionId &&
                    choice.slotId === row.choice.slotId &&
                    choice.phaseKey === row.choice.phaseKey &&
                    choice.role === row.choice.role,
                ) ?? row.choice
              const selectedName =
                row.alternatives.find(
                  (option) =>
                    option.movementId === selected.replacementMovementId,
                )?.movementName ?? row.replacementMovementName
              return (
                <Panel
                  key={`${row.choice.templateSessionId}:${row.choice.slotId}:${row.choice.phaseKey}:${row.choice.role}`}
                  surface="inset"
                  p="sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color="neutral" size="xs">
                      {row.sessionTitle}
                    </Badge>
                    <Badge color="action" size="xs">
                      {row.phaseLabel}
                    </Badge>
                    {slotLabel ? (
                      <Badge color="neutral" size="xs">
                        {slotLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <Text size="sm" fw={700} truncate>
                      {enabling
                        ? row.sourceMovementName
                        : selectedName}
                    </Text>
                    <ArrowRight size={14} className="shrink-0" />
                    <Text size="sm" fw={800} truncate>
                      {enabling
                        ? selectedName
                        : row.sourceMovementName}
                    </Text>
                  </div>
                  {enabling && row.alternatives.length > 1 ? (
                    <div className="mt-3">
                      <SectionLabel component="label">
                        Free-weight equivalent
                      </SectionLabel>
                      <Select
                        mt={5}
                        aria-label={`Choose a free-weight equivalent for ${row.sourceMovementName} in ${row.sessionTitle}, ${row.phaseLabel}${slotLabel ? `, ${slotLabel}` : ''}`}
                        value={selected.replacementMovementId}
                        data={row.alternatives.map((option) => ({
                          value: option.movementId,
                          label: option.movementName,
                        }))}
                        allowDeselect={false}
                        searchable
                        onChange={(value) => {
                          if (value) onChoiceChange(row.choice, value)
                        }}
                      />
                    </div>
                  ) : null}
                </Panel>
              )
            })}
          </div>
        )}

        {error ? <Text tone="danger">{error}</Text> : null}

        <div className="flex justify-end gap-2">
          <Button variant="default" disabled={isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canApply}
            loading={isPending}
            onClick={onConfirm}
          >
            {enabling ? 'Use free weights only' : 'Use all equipment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function equipmentModeSlotLabel(slotId: string) {
  const addition = slotId.match(/added-accessory-(\d+)-/)
  return addition ? `Added accessory ${addition[1]}` : null
}
