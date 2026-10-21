import { useState } from 'react'
import type { ProgramSetupOptions } from '@sheetless/domain/program/types'
import { SegmentedControl } from '@/components'
import { TemplateEquipmentModeCard } from './TemplateEquipmentModeCard'
import { TemplateSetupPreview } from './TemplateSetupPreview'
import { TemplateStartSetupSheets, type TemplateSwapTarget } from './TemplateStartSetupSheets'
import type { TemplateStartCustomizationController } from './useTemplateStartCustomizations'

export function SetupEquipmentStep({ setup, equipmentProfile, customizations, disabled }: {
  setup: ProgramSetupOptions; equipmentProfile: string[]; customizations: TemplateStartCustomizationController; disabled: boolean
}) {
  const [weekIndex, setWeekIndex] = useState(0)
  const [swapTarget, setSwapTarget] = useState<TemplateSwapTarget | null>(null)
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null)
  const [accessorySession, setAccessorySession] = useState<ProgramSetupOptions['sessions'][number] | null>(null)
  const week = setup.previewWeeks.find((item) => item.index === weekIndex) ?? setup.previewWeeks[0]
  return <>
    <TemplateEquipmentModeCard mode={customizations.equipmentMode} replacementCount={customizations.freeWeightPreview.changes.length}
      unresolvedCount={customizations.freeWeightPreview.unresolved.length} reviewNeeded={customizations.reviewNeeded} disabled={disabled}
      onChange={customizations.requestEquipmentMode} onReview={() => customizations.setReviewOpen(true)} />
    <SegmentedControl variant="pills" accessibilityLabel="Preview week" value={String(week?.index ?? '')}
      options={setup.previewWeeks.map((item) => ({ value: String(item.index), label: item.label }))} disabled={disabled} onChange={(value: string) => setWeekIndex(Number(value))} />
    {week ? <TemplateSetupPreview week={week} setup={setup} movementOverrides={customizations.movementOverrides}
      accessoryAdditions={customizations.accessoryAdditions} equipmentMode={customizations.equipmentMode} freeWeightChoices={customizations.freeWeightChoices}
      equipmentProfile={equipmentProfile} disabled={disabled} onSwap={(movement, options, selected) => { setSwapTarget({ movement, options }); setSelectedSwapId(selected) }}
      onReset={(movement) => customizations.setMovementOverride(movement, movement.defaultMovementId)} onAddAccessory={setAccessorySession} onRemoveAccessory={customizations.removeAccessory} /> : null}
    <TemplateStartSetupSheets setup={setup} equipmentProfile={equipmentProfile} controlsDisabled={disabled} swapTarget={swapTarget}
      selectedSwapId={selectedSwapId} accessorySession={accessorySession} customizations={customizations} onSelectSwap={setSelectedSwapId}
      onCloseSwap={() => { if (!disabled) setSwapTarget(null) }} onCloseAccessory={() => { if (!disabled) setAccessorySession(null) }} />
  </>
}
