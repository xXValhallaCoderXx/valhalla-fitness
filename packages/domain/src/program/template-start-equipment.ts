import {
  buildSetupFreeWeightPreview,
  freeWeightChoiceKey,
  normalizeFreeWeightChoices,
} from '@sheetless/domain/program/equipment-mode'
import type {
  FreeWeightChoiceDraft,
  ProgramSetupOptions,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
} from '@sheetless/domain/program/types'

export type SetupFreeWeightPreview = ReturnType<
  typeof buildSetupFreeWeightPreview
>

export function buildSetupPreviewForCustomizations(
  setupOptions: ProgramSetupOptions,
  movementOverrides: ProgramStartMovementOverrideInput[],
  accessoryAdditions: ProgramStartAccessoryAdditionInput[],
) {
  return buildSetupFreeWeightPreview({
    setupOptions,
    movementOverrides,
    accessoryAdditions,
  })
}

export function reconcileFreeWeightChoices(
  preview: SetupFreeWeightPreview,
  current: FreeWeightChoiceDraft[],
) {
  const currentByKey = new Map(
    current.map((choice) => [freeWeightChoiceKey(choice), choice]),
  )
  return normalizeFreeWeightChoices(
    preview.choices.map((choice) => {
      const reviewed = currentByKey.get(freeWeightChoiceKey(choice))
      const change = preview.changes.find(
        (candidate) =>
          freeWeightChoiceKey(candidate.choice) ===
          freeWeightChoiceKey(choice),
      )
      return reviewed &&
        reviewed.sourceMovementId === choice.sourceMovementId &&
        change?.alternatives.some(
          (alternative) =>
            alternative.movementId === reviewed.replacementMovementId,
        )
        ? reviewed
        : choice
    }),
  )
}

export function freeWeightChoicesNeedReview({
  preview,
  choices,
  reviewedChoices,
}: {
  preview: SetupFreeWeightPreview
  choices: FreeWeightChoiceDraft[]
  reviewedChoices: FreeWeightChoiceDraft[]
}) {
  if (!preview.canApply || preview.unresolved.length) return true

  const choicesByKey = new Map(
    choices.map((choice) => [freeWeightChoiceKey(choice), choice]),
  )
  const reviewedByKey = new Map(
    reviewedChoices.map((choice) => [freeWeightChoiceKey(choice), choice]),
  )
  return preview.choices.some((expected) => {
    const key = freeWeightChoiceKey(expected)
    const choice = choicesByKey.get(key)
    const reviewed = reviewedByKey.get(key)
    const change = preview.changes.find(
      (candidate) => freeWeightChoiceKey(candidate.choice) === key,
    )
    return (
      !choice ||
      !reviewed ||
      choice.sourceMovementId !== expected.sourceMovementId ||
      reviewed.sourceMovementId !== expected.sourceMovementId ||
      reviewed.replacementMovementId !== choice.replacementMovementId ||
      !change?.alternatives.some(
        (alternative) =>
          alternative.movementId === choice.replacementMovementId,
      )
    )
  })
}
