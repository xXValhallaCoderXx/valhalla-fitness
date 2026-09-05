import { useMemo, useState } from 'react'
import {
  buildSetupPreviewForCustomizations,
  freeWeightChoicesNeedReview,
  reconcileFreeWeightChoices,
} from '@sheetless/domain/program/template-start-equipment'
import {
  freeWeightChoiceKey,
  normalizeFreeWeightChoices,
} from '~/domains/program/lib/equipment-mode'
import {
  accessoryDraftClientId,
  isSetupConfigurableRole,
  type AccessoryAdditionDraft,
} from '~/domains/program/lib/template-start-utils'
import type {
  FreeWeightChoiceDraft,
  ProgramEquipmentMode,
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
} from '~/domains/program'

type ChoiceState = {
  choices: FreeWeightChoiceDraft[]
  reviewedChoices: FreeWeightChoiceDraft[]
}

function previewForCustomizations(
  setupOptions: ProgramSetupOptions,
  movementOverrides: ProgramStartMovementOverrideInput[],
  accessoryAdditions: AccessoryAdditionDraft[],
) {
  return buildSetupPreviewForCustomizations(
    setupOptions,
    movementOverrides,
    accessoryAdditions.map(
      ({ sessionId, sourceSlotId, movementId, phaseKey }) => ({
        sessionId,
        sourceSlotId,
        movementId,
        phaseKey,
      }),
    ),
  )
}

export function useTemplateStartEquipmentMode({
  setupOptions,
}: {
  setupOptions: ProgramSetupOptions
}) {
  const [movementOverrides, setMovementOverrides] = useState<
    ProgramStartMovementOverrideInput[]
  >([])
  const [accessoryAdditions, setAccessoryAdditions] = useState<
    AccessoryAdditionDraft[]
  >([])
  const [equipmentMode, setEquipmentMode] =
    useState<ProgramEquipmentMode>('standard')
  const [showEquipmentModePreview, setShowEquipmentModePreview] =
    useState(false)
  const [choiceState, setChoiceState] = useState<ChoiceState>({
    choices: [],
    reviewedChoices: [],
  })
  const freeWeightPreview = useMemo(
    () =>
      previewForCustomizations(
        setupOptions,
        movementOverrides,
        accessoryAdditions,
      ),
    [accessoryAdditions, movementOverrides, setupOptions],
  )
  const equipmentModeReviewDirty =
    equipmentMode === 'free_weight' &&
    freeWeightChoicesNeedReview({
      preview: freeWeightPreview,
      choices: choiceState.choices,
      reviewedChoices: choiceState.reviewedChoices,
    })

  const reconcileChoicesForCustomizations = (
    nextOverrides: ProgramStartMovementOverrideInput[],
    nextAdditions: AccessoryAdditionDraft[],
  ) => {
    if (equipmentMode !== 'free_weight') return
    const preview = previewForCustomizations(
      setupOptions,
      nextOverrides,
      nextAdditions,
    )
    setChoiceState((current) => ({
      ...current,
      choices: reconcileFreeWeightChoices(preview, current.choices),
    }))
  }

  const handleMovementOverrideChange = (
    movement: ProgramSetupPreviewMovement,
    replacementMovementId: string,
  ) => {
    if (!isSetupConfigurableRole(movement.role)) return
    const role = movement.role
    const withoutSlot = movementOverrides.filter(
      (override) =>
        !(
          override.slotId === movement.slotId &&
          override.phaseKey === movement.setupPhaseKey &&
          override.role === role
        ),
    )
    const nextOverrides =
      replacementMovementId === movement.defaultMovementId
        ? withoutSlot
        : [
            ...withoutSlot,
            {
              slotId: movement.slotId,
              phaseKey: movement.setupPhaseKey,
              role,
              originalMovementId: movement.defaultMovementId,
              replacementMovementId,
            },
          ]
    setMovementOverrides(nextOverrides)
    reconcileChoicesForCustomizations(nextOverrides, accessoryAdditions)
  }

  const handleAddAccessory = (
    addition: ProgramStartAccessoryAdditionInput,
  ) => {
    const nextAdditions = [
      ...accessoryAdditions,
      { ...addition, clientId: accessoryDraftClientId(addition) },
    ]
    setAccessoryAdditions(nextAdditions)
    reconcileChoicesForCustomizations(movementOverrides, nextAdditions)
  }

  const handleRemoveAccessory = (clientId: string) => {
    const nextAdditions = accessoryAdditions.filter(
      (addition) => addition.clientId !== clientId,
    )
    setAccessoryAdditions(nextAdditions)
    reconcileChoicesForCustomizations(movementOverrides, nextAdditions)
  }

  const requestEquipmentMode = (nextMode: ProgramEquipmentMode) => {
    if (nextMode === 'standard') {
      setEquipmentMode('standard')
      setShowEquipmentModePreview(false)
      return
    }
    setChoiceState((current) => ({
      ...current,
      choices: reconcileFreeWeightChoices(
        freeWeightPreview,
        current.choices,
      ),
    }))
    setShowEquipmentModePreview(true)
  }

  const updateFreeWeightChoice = (
    choice: FreeWeightChoiceDraft,
    replacementMovementId: string,
  ) => {
    setChoiceState((current) => {
      const key = freeWeightChoiceKey(choice)
      return {
        ...current,
        choices: normalizeFreeWeightChoices([
          ...current.choices.filter(
            (candidate) => freeWeightChoiceKey(candidate) !== key,
          ),
          { ...choice, replacementMovementId },
        ]),
      }
    })
  }

  const confirmEquipmentMode = () => {
    if (!freeWeightPreview.canApply) return
    setChoiceState((current) => {
      const choices = reconcileFreeWeightChoices(
        freeWeightPreview,
        current.choices,
      )
      return { choices, reviewedChoices: choices }
    })
    setEquipmentMode('free_weight')
    setShowEquipmentModePreview(false)
  }

  return {
    movementOverrides,
    accessoryAdditions,
    customizationCount: movementOverrides.length + accessoryAdditions.length,
    equipmentMode,
    freeWeightChoices: choiceState.choices,
    freeWeightPreview,
    showEquipmentModePreview,
    equipmentModeReviewNeeded: equipmentModeReviewDirty,
    setShowEquipmentModePreview,
    handleMovementOverrideChange,
    handleAddAccessory,
    handleRemoveAccessory,
    requestEquipmentMode,
    updateFreeWeightChoice,
    confirmEquipmentMode,
  }
}
