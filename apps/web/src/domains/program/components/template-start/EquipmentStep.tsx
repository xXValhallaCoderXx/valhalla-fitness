import { ProgrammeBlocksCard } from '../TemplateStartBlocks'
import { TemplateStartEquipmentModeSection } from '../TemplateStartEquipmentModeSection'
import { TemplateStartPreview } from '../TemplateStartPreview'
import type { SetupStepProps } from './step-props'

/**
 * Step 2 — equipment mode, then the swaps and accessories it allows.
 *
 * The block/phase picker lives here rather than in Schedule because it chooses which week the
 * preview below shows: a control and the thing it changes must not be on separate steps.
 */
export function EquipmentStep({ start, me, setupOptions }: SetupStepProps) {
  return (
    <div className="space-y-4">
      <TemplateStartEquipmentModeSection
        equipmentMode={start.equipmentMode}
        freeWeightChoices={start.freeWeightChoices}
        freeWeightPreview={start.freeWeightPreview}
        showEquipmentModePreview={start.showEquipmentModePreview}
        setShowEquipmentModePreview={start.setShowEquipmentModePreview}
        requestEquipmentMode={start.requestEquipmentMode}
        updateFreeWeightChoice={start.updateFreeWeightChoice}
        confirmEquipmentMode={start.confirmEquipmentMode}
      />
      <ProgrammeBlocksCard
        mode={start.mode}
        phases={start.phases}
        activePhaseKey={start.activePhaseKey}
        weeks={setupOptions.previewWeeks}
        onSelectPhase={start.setActiveWeekIndex}
      />
      <TemplateStartPreview
        activeWeek={start.activeWeek}
        activeWeekOption={start.activeWeekOption}
        weekOptions={start.weekOptions}
        mode={start.mode}
        phases={start.phases}
        activePhaseKey={start.activePhaseKey}
        changedSlots={start.changedSlots}
        units={start.units}
        equipmentProfile={me.equipmentProfile}
        setupOptions={setupOptions}
        movementOverrides={start.movementOverrides}
        accessoryAdditions={start.accessoryAdditions}
        equipmentMode={start.equipmentMode}
        freeWeightChoices={start.freeWeightChoices}
        onWeekChange={start.setActiveWeekIndex}
        onMovementOverrideChange={start.handleMovementOverrideChange}
        onAddAccessory={start.handleAddAccessory}
        onRemoveAccessory={start.handleRemoveAccessory}
      />
    </div>
  )
}
