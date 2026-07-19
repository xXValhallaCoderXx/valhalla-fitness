import { getMovementName, movementCatalog } from '~/domains/movement/lib/movements'
import {
  createDefaultCustomProgramBuilderInput,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from './custom-program-meta'

export type CustomBuilderStep = 'methodology' | 'main_lifts' | 'accessories' | 'review'

const customBuilderSteps: Array<{ id: CustomBuilderStep; label: string }> = [
  { id: 'methodology', label: 'Goal & methodology' },
  { id: 'main_lifts', label: 'Main lifts' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'review', label: 'Review' },
]

export function customBuilderStepsFor(methodology: CustomProgramMethodology): Array<{ id: CustomBuilderStep; label: string }> {
  if (methodology === 'none') {
    return [
      { id: 'methodology', label: 'Goal & schedule' },
      { id: 'main_lifts', label: 'Exercises' },
      { id: 'review', label: 'Review' },
    ]
  }
  return customBuilderSteps
}

export const mainMovementOptions = Object.values(movementCatalog)
  .filter((movement) => movement.isCompetition)
  .sort((left, right) => left.name.localeCompare(right.name))

export const variationMovementOptions = Object.values(movementCatalog)
  .filter((movement) => !movement.isCompetition && movement.variationOf)
  .sort((left, right) => left.name.localeCompare(right.name))

export const accessoryMovementOptions = Object.values(movementCatalog)
  .filter((movement) => !movement.isCompetition)
  .sort((left, right) => left.name.localeCompare(right.name))

export const loggerMovementOptions = Object.values(movementCatalog)
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

export function mainWorkSummary(methodology: CustomProgramMethodology, session: CustomProgramBuilderInput['sessions'][number]) {
  if (methodology === 'training_max_wave') return 'Training-max wave work'
  if (methodology === 'plus_set_wave') return 'Plus-set wave work'
  if (methodology === 'simple_linear') return '3x5 @ current working load'
  return `${session.mainSetCount}x${session.mainTargetReps} main work`
}

export function variationSummary(session: CustomProgramBuilderInput['sessions'][number]) {
  return session.variationMovementId ? getMovementName(session.variationMovementId) : 'None'
}
