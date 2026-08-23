import type { MovementSwapOption } from '@sheetless/domain/movement/types'
import type {
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
} from '@sheetless/domain/program/types'
import { EquipmentModeReviewSheet } from '@/features/program/EquipmentModeReviewSheet'
import { MovementPickerSheet } from '@/features/session/MovementPickerSheet'
import { TemplateAccessorySheet } from './TemplateAccessorySheet'
import type { TemplateStartCustomizationController } from './useTemplateStartCustomizations'

export type TemplateSwapTarget = {
  movement: ProgramSetupPreviewMovement
  options: MovementSwapOption[]
}

export function TemplateStartSetupSheets({
  setup,
  equipmentProfile,
  controlsDisabled,
  swapTarget,
  selectedSwapId,
  accessorySession,
  customizations,
  onSelectSwap,
  onCloseSwap,
  onCloseAccessory,
}: {
  setup: ProgramSetupOptions
  equipmentProfile: string[]
  controlsDisabled: boolean
  swapTarget: TemplateSwapTarget | null
  selectedSwapId: string | null
  accessorySession: ProgramSetupOptions['sessions'][number] | null
  customizations: TemplateStartCustomizationController
  onSelectSwap: (movementId: string | null) => void
  onCloseSwap: () => void
  onCloseAccessory: () => void
}) {
  return (
    <>
      <MovementPickerSheet
        open={Boolean(swapTarget)}
        title="Choose setup movement"
        subtitle="This replacement applies to the selected phase only."
        confirmLabel="Use movement"
        options={swapTarget?.options ?? []}
        selectedMovementId={selectedSwapId}
        disabled={controlsDisabled}
        onSelectMovement={onSelectSwap}
        onClose={onCloseSwap}
        onConfirm={(option) => {
          if (!swapTarget) return
          customizations.setMovementOverride(swapTarget.movement, option.movementId)
          onCloseSwap()
        }}
        searchPlaceholder="Search setup replacements"
        emptyMessage="No replacements match your saved equipment and mode."
      />

      <TemplateAccessorySheet
        open={Boolean(accessorySession)}
        setup={setup}
        session={accessorySession}
        equipmentMode={customizations.equipmentMode}
        equipmentProfile={equipmentProfile}
        disabled={controlsDisabled}
        onClose={onCloseAccessory}
        onAdd={customizations.addAccessory}
      />

      <EquipmentModeReviewSheet
        open={customizations.reviewOpen}
        targetMode="free_weight"
        rows={customizations.freeWeightPreview.changes}
        choices={customizations.freeWeightChoices}
        unresolved={customizations.freeWeightPreview.unresolved.map((item) => ({
          sourceMovementName: item.sourceMovementName,
          sessionTitle: setup.sessions.find((session) => session.id === item.templateSessionId)?.title,
          phaseLabel: setup.previewWeeks.find((week) => week.phaseKey === item.phaseKey)?.phaseLabel,
        }))}
        canApply={customizations.freeWeightPreview.canApply}
        isPending={controlsDisabled}
        error={!customizations.freeWeightPreview.canApply && !customizations.freeWeightPreview.unresolved.length
          ? 'Free-weight conversion is unavailable for this programme right now.'
          : null}
        onChoiceChange={customizations.updateChoice}
        onClose={() => {
          if (!controlsDisabled) customizations.setReviewOpen(false)
        }}
        onConfirm={customizations.confirmFreeWeightMode}
      />
    </>
  )
}
