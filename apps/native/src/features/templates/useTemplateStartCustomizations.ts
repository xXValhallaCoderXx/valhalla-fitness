import { useMemo, useState } from 'react'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramStartMovementOverrideInput,
} from '@sheetless/domain/program/types'
import {
  buildSetupPreviewForCustomizations,
  freeWeightChoicesNeedReview,
  reconcileFreeWeightChoices,
} from '@sheetless/domain/program/template-start-equipment'
import {
  accessoryDraftClientId,
  isSetupConfigurableRole,
  type AccessoryAdditionDraft,
} from '@sheetless/domain/program/template-start-utils'
import { freeWeightChoiceKey, normalizeFreeWeightChoices } from '@sheetless/domain/program/equipment-mode'

type ChoiceState = {
  choices: FreeWeightChoiceDraft[]
  reviewedChoices: FreeWeightChoiceDraft[]
}

function strippedAdditions(additions: AccessoryAdditionDraft[]) {
  return additions.map(({ sessionId, sourceSlotId, movementId, phaseKey }) => ({
    sessionId,
    sourceSlotId,
    movementId,
    phaseKey,
  }))
}

export function useTemplateStartCustomizations(setup: ProgramSetupOptions) {
  const [movementOverrides, setMovementOverrides] = useState<ProgramStartMovementOverrideInput[]>([])
  const [accessoryAdditions, setAccessoryAdditions] = useState<AccessoryAdditionDraft[]>([])
  const [equipmentMode, setEquipmentMode] = useState<ProgramEquipmentMode>('standard')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [choiceState, setChoiceState] = useState<ChoiceState>({
    choices: [],
    reviewedChoices: [],
  })
  const additions = useMemo(() => strippedAdditions(accessoryAdditions), [accessoryAdditions])
  const freeWeightPreview = useMemo(
    () => buildSetupPreviewForCustomizations(setup, movementOverrides, additions),
    [additions, movementOverrides, setup],
  )
  const reviewNeeded = equipmentMode === 'free_weight' && freeWeightChoicesNeedReview({
    preview: freeWeightPreview,
    choices: choiceState.choices,
    reviewedChoices: choiceState.reviewedChoices,
  })

  const reconcileFor = (
    nextOverrides: ProgramStartMovementOverrideInput[],
    nextAdditions: AccessoryAdditionDraft[],
  ) => {
    if (equipmentMode !== 'free_weight') return
    const preview = buildSetupPreviewForCustomizations(
      setup,
      nextOverrides,
      strippedAdditions(nextAdditions),
    )
    setChoiceState((current) => ({
      ...current,
      choices: reconcileFreeWeightChoices(preview, current.choices),
    }))
  }

  const setMovementOverride = (
    movement: ProgramSetupPreviewMovement,
    replacementMovementId: string,
  ) => {
    if (!isSetupConfigurableRole(movement.role)) return
    const withoutSlot = movementOverrides.filter((override) => !(
      override.slotId === movement.slotId &&
      override.phaseKey === movement.setupPhaseKey &&
      override.role === movement.role
    ))
    const next = replacementMovementId === movement.defaultMovementId
      ? withoutSlot
      : [
          ...withoutSlot,
          {
            slotId: movement.slotId,
            phaseKey: movement.setupPhaseKey,
            role: movement.role,
            originalMovementId: movement.defaultMovementId,
            replacementMovementId,
          },
        ]
    setMovementOverrides(next)
    reconcileFor(next, accessoryAdditions)
  }

  const addAccessory = (addition: Omit<AccessoryAdditionDraft, 'clientId'>) => {
    const next = [
      ...accessoryAdditions,
      { ...addition, clientId: accessoryDraftClientId(addition) },
    ]
    setAccessoryAdditions(next)
    reconcileFor(movementOverrides, next)
  }

  const removeAccessory = (clientId: string) => {
    const next = accessoryAdditions.filter((addition) => addition.clientId !== clientId)
    setAccessoryAdditions(next)
    reconcileFor(movementOverrides, next)
  }

  const requestEquipmentMode = (mode: ProgramEquipmentMode) => {
    if (mode === 'standard') {
      setEquipmentMode('standard')
      setReviewOpen(false)
      return
    }
    setChoiceState((current) => ({
      ...current,
      choices: reconcileFreeWeightChoices(freeWeightPreview, current.choices),
    }))
    setReviewOpen(true)
  }

  const updateChoice = (choice: FreeWeightChoiceDraft, replacementMovementId: string) => {
    setChoiceState((current) => ({
      ...current,
      choices: normalizeFreeWeightChoices([
        ...current.choices.filter(
          (candidate) => freeWeightChoiceKey(candidate) !== freeWeightChoiceKey(choice),
        ),
        { ...choice, replacementMovementId },
      ]),
    }))
  }

  const confirmFreeWeightMode = () => {
    if (!freeWeightPreview.canApply || freeWeightPreview.unresolved.length) return
    setChoiceState((current) => {
      const choices = reconcileFreeWeightChoices(freeWeightPreview, current.choices)
      return { choices, reviewedChoices: choices }
    })
    setEquipmentMode('free_weight')
    setReviewOpen(false)
  }

  return {
    movementOverrides,
    accessoryAdditions,
    additions,
    equipmentMode,
    freeWeightChoices: choiceState.choices,
    freeWeightPreview,
    reviewNeeded,
    reviewOpen,
    dirty: movementOverrides.length > 0 || accessoryAdditions.length > 0 || equipmentMode !== 'standard',
    setReviewOpen,
    setMovementOverride,
    addAccessory,
    removeAccessory,
    requestEquipmentMode,
    updateChoice,
    confirmFreeWeightMode,
  }
}

export type TemplateStartCustomizationController = ReturnType<
  typeof useTemplateStartCustomizations
>
