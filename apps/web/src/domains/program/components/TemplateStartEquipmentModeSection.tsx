import { SegmentedControl } from '@mantine/core'
import {
  Caption,
  EquipmentModeBadge,
  Panel,
  SectionLabel,
} from '~/components'
import { EquipmentModePreviewModal } from './EquipmentModePreviewModal'
import type { useTemplateStartEquipmentMode } from './useTemplateStartEquipmentMode'

type TemplateStartEquipmentModeSectionProps = Pick<
  ReturnType<typeof useTemplateStartEquipmentMode>,
  | 'equipmentMode'
  | 'freeWeightChoices'
  | 'freeWeightPreview'
  | 'showEquipmentModePreview'
  | 'setShowEquipmentModePreview'
  | 'requestEquipmentMode'
  | 'updateFreeWeightChoice'
  | 'confirmEquipmentMode'
>

export function TemplateStartEquipmentModeSection({
  equipmentMode,
  freeWeightChoices,
  freeWeightPreview,
  showEquipmentModePreview,
  setShowEquipmentModePreview,
  requestEquipmentMode,
  updateFreeWeightChoice,
  confirmEquipmentMode,
}: TemplateStartEquipmentModeSectionProps) {
  return (
    <>
      <Panel p="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel>Equipment</SectionLabel>
              <EquipmentModeBadge equipmentMode={equipmentMode} />
            </div>
            <Caption mt={4} lh={1.5}>
              Free weights only replaces cable and machine work across every
              future phase before you start.
            </Caption>
          </div>
          <SegmentedControl
            aria-label="Equipment mode"
            value={equipmentMode}
            data={[
              { value: 'standard', label: 'All equipment' },
              { value: 'free_weight', label: 'Free weights only' },
            ]}
            onChange={(value) =>
              requestEquipmentMode(value as 'standard' | 'free_weight')
            }
          />
        </div>
      </Panel>

      <EquipmentModePreviewModal
        opened={showEquipmentModePreview}
        targetMode="free_weight"
        rows={freeWeightPreview.changes}
        choices={freeWeightChoices}
        unresolvedCount={freeWeightPreview.unresolved.length}
        canApply={freeWeightPreview.canApply}
        onChoiceChange={updateFreeWeightChoice}
        onClose={() => setShowEquipmentModePreview(false)}
        onConfirm={confirmEquipmentMode}
      />
    </>
  )
}
