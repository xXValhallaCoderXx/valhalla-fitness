import type { ProgramSetupPreviewMovement, ProgramStateInput } from './types'
import type { Unit } from '../shared/types'
import { resolveTemplateTargetLoad } from './template-load'
import { previewPrescriptionLines } from './template-preview-presentation'

export type PersonalPreviewLine = {
  count: number
  load: number | null
  loadLabel: string | null
  reps: string
  effort: string
  kind: string
}

/** Read-only grouping of the actual compiler's targets, with unknown values left unknown. */
export function personalTemplatePreviewLines(
  movement: ProgramSetupPreviewMovement,
  input: { stateValues: ProgramStateInput[]; units: Unit; rounding: number },
): PersonalPreviewLine[] {
  const lines: PersonalPreviewLine[] = []
  for (const set of movement.sets ?? []) {
    const prescription = previewPrescriptionLines([set])[0]
    const needsUnknownAnchor = set.targetLoad?.kind === 'percent_of_state'
      && !set.targetLoad.stateKey && !movement.anchorMovementId
    const load = needsUnknownAnchor ? null : resolveTemplateTargetLoad(set.targetLoad, {
      ...input, movementId: movement.defaultMovementId,
      anchorMovementId: movement.anchorMovementId ?? movement.defaultMovementId,
    }, 'unavailable')
    const loadLabel = load !== null ? null : !set.targetLoad ? 'Load not specified'
      : set.targetLoad.kind === 'user_selected' || (set.targetLoad.kind === 'percent_of_state' && set.targetLoad.default === 'blank')
        ? 'Choose your load' : 'Starting weight unavailable'
    const next = { load, loadLabel, reps: prescription.reps, effort: prescription.effort, kind: prescription.kind }
    const previous = lines.at(-1)
    if (previous && previous.load === next.load && previous.loadLabel === next.loadLabel
      && previous.reps === next.reps && previous.effort === next.effort && previous.kind === next.kind) previous.count++
    else lines.push({ count: 1, ...next })
  }
  return lines
}
