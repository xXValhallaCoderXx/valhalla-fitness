import {
  getMovementName,
  isActiveMovement,
  movementCatalog,
} from '@sheetless/domain/movement/movements'
import {
  createDefaultCustomProgramBuilderInput,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from './custom-program-meta'

export type CustomBuilderStep = 'methodology' | 'main_lifts' | 'accessories' | 'review'

const customBuilderSteps: Array<{ id: CustomBuilderStep; label: string }> = [
  { id: 'methodology', label: 'Goal & method' },
  { id: 'main_lifts', label: 'Main lifts' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'review', label: 'Review' },
]

/**
 * What this step is asking for.
 *
 * One line per step: the page used to print the step-2 sentence above every step, which was simply
 * wrong on three of the four.
 */
export function customBuilderStepSubtitle(
  step: CustomBuilderStep,
  methodology: CustomProgramMethodology,
): string {
  if (step === 'methodology') {
    return 'Name the programme and choose how Sheetless should regulate your training.'
  }
  if (step === 'main_lifts') {
    return methodology === 'none'
      ? 'Set your week, then add the exercises you want to repeat each day.'
      : 'Set your week, then pick a main lift for each day. Sheetless fills in the sets and the rule for adding weight.'
  }
  if (step === 'accessories') {
    return 'Add the supporting work for each day. Accessories stay at a load you choose.'
  }
  return 'Check the week Sheetless built, then create the programme.'
}

export function customBuilderStepsFor(methodology: CustomProgramMethodology): Array<{ id: CustomBuilderStep; label: string }> {
  if (methodology === 'none') {
    return [
      { id: 'methodology', label: 'Goal & method' },
      { id: 'main_lifts', label: 'Exercises' },
      { id: 'review', label: 'Review' },
    ]
  }
  return customBuilderSteps
}

export const mainMovementOptions = Object.values(movementCatalog)
  .filter((movement) => isActiveMovement(movement) && movement.isCompetition)
  .sort((left, right) => left.name.localeCompare(right.name))

export const variationMovementOptions = Object.values(movementCatalog)
  .filter((movement) => isActiveMovement(movement) && !movement.isCompetition && movement.variationOf)
  .sort((left, right) => left.name.localeCompare(right.name))

export const accessoryMovementOptions = Object.values(movementCatalog)
  .filter((movement) => isActiveMovement(movement) && !movement.isCompetition)
  .sort((left, right) => left.name.localeCompare(right.name))

export const loggerMovementOptions = Object.values(movementCatalog)
  .filter(isActiveMovement)
  .sort((left, right) => left.name.localeCompare(right.name))

export function customBuilderDayTitle(index: number, movementId: string) {
  return `Day ${index + 1} - ${getMovementName(movementId)} day`
}

export function clampIntegerInput(value: string | number, fallback: number, min: number, max: number) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

export function clampBuilderDayCount(value: string | number, fallback: number) {
  return clampIntegerInput(value, fallback, 1, 7)
}

export function resizeCustomSessions(
  current: CustomProgramBuilderInput,
  daysPerWeek: number,
): CustomProgramBuilderInput {
  const nextDefault = createDefaultCustomProgramBuilderInput({
    methodology: current.methodology,
    daysPerWeek,
  })
  return {
    ...current,
    daysPerWeek,
    sessions: Array.from({ length: daysPerWeek }, (_, index) => {
      const existing = current.sessions[index]
      if (existing) {
        return {
          ...existing,
          title: customBuilderDayTitle(index, existing.mainMovementId),
        }
      }
      return nextDefault.sessions[index]!
    }),
  }
}

/**
 * What the main lift will do each day, in plain words — the Guided card's rule line.
 *
 * `mainWorkSummary` is notation ("3x5 @ current working load") and belongs to Full. Guided's whole
 * premise is that it never shows the working, so it gets a sentence describing what Sheetless will
 * actually do with the lift.
 */
export function mainWorkSentence(
  methodology: CustomProgramMethodology,
  session: CustomProgramBuilderInput['sessions'][number],
): string {
  if (methodology === 'training_max_wave') {
    return 'Three sets that ramp up in weight, the last pushed for extra reps, then lighter back-off sets.'
  }
  if (methodology === 'plus_set_wave') {
    return 'A few sets at one weight, with the last pushed for as many good reps as you can.'
  }
  if (methodology === 'simple_linear') {
    return 'Three sets of five. Get every rep and the weight goes up next time.'
  }
  const sets = session.mainSetCount
  const reps = session.mainTargetReps
  return `${sets} ${sets === 1 ? 'set' : 'sets'} of ${reps}, logged as you go.`
}

/**
 * One day, in a few words — the "Your week" right-hand column.
 *
 * Deliberately not `${mainSetCount} sets of ${mainTargetReps}`: those two fields only survive
 * normalisation for `simple_linear` (which forces 3×5 anyway), so a training-max wave was reporting
 * the untouched draft defaults — "4 sets of 8" for a day that runs three ramping sets and five
 * back-offs.
 */
export function weekDaySummary(
  methodology: CustomProgramMethodology,
  session: CustomProgramBuilderInput['sessions'][number],
): string {
  if (methodology === 'none') {
    const count = session.loggerExercises.length
    return `${count} exercise${count === 1 ? '' : 's'}`
  }
  if (methodology === 'training_max_wave') return '3 sets, then back-off'
  if (methodology === 'plus_set_wave') return 'Sets, last one pushed'
  return '3 sets of 5'
}

export function mainWorkSummary(methodology: CustomProgramMethodology, session: CustomProgramBuilderInput['sessions'][number]) {
  if (methodology === 'training_max_wave') return 'Training-max wave work'
  if (methodology === 'plus_set_wave') return 'Plus-set wave work'
  if (methodology === 'simple_linear') return '3x5 @ current working load'
  return `${session.mainSetCount}x${session.mainTargetReps} main work`
}

export function variationSummary(session: CustomProgramBuilderInput['sessions'][number]) {
  return session.variationMovementId ? getMovementName(session.variationMovementId) : 'None'
}
