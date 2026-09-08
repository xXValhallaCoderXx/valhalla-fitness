import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { ProgramStateInput } from '@sheetless/domain/program/types'
import { missingRequiredLoadMessage } from '@sheetless/domain/program/template-start-utils'

export type SetupStepId = 'numbers' | 'equipment' | 'schedule' | 'review'

/** Order is the flow, and the index + 1 is the number shown in the rail. */
export const SETUP_STEPS = ['numbers', 'equipment', 'schedule', 'review'] as const

type ModeLabel = Record<ExperienceMode, string>
const label = (guided: string, full: string): ModeLabel => ({ guided, full })

/**
 * Guided and Full name the same four steps.
 *
 * Only the first differs: Full is setting training maxes, Guided is setting starting weights, and
 * the step rail should not promise a word the step body never uses.
 */
export const setupStepLabels: Record<SetupStepId, ModeLabel> = {
  numbers: label('Starting weights', 'Starting numbers'),
  equipment: label('Equipment & swaps', 'Equipment & swaps'),
  schedule: label('Schedule', 'Schedule'),
  review: label('Review', 'Review'),
}

/** Short form for the forward button — the design labels it by destination, not "Next". */
const stepDestinations: Record<SetupStepId, string> = {
  numbers: 'starting numbers',
  equipment: 'equipment',
  schedule: 'schedule',
  review: 'review',
}

export function setupStepLabel(step: SetupStepId, mode: ExperienceMode): string {
  return setupStepLabels[step][mode]
}

/** 1-based, for display. */
export function setupStepPosition(step: SetupStepId): number {
  return SETUP_STEPS.indexOf(step) + 1
}

export function adjacentSetupStep(step: SetupStepId, direction: 'next' | 'previous'): SetupStepId | null {
  const index = SETUP_STEPS.indexOf(step)
  if (index === -1) return null
  return SETUP_STEPS[index + (direction === 'next' ? 1 : -1)] ?? null
}

/** "Continue to equipment"; null on the last step, where the action is Start, not Continue. */
export function continueToLabel(step: SetupStepId): string | null {
  const next = adjacentSetupStep(step, 'next')
  return next ? `Continue to ${stepDestinations[next]}` : null
}

export type SetupBlocker = {
  step: SetupStepId
  message: string
}

/**
 * What stops the wizard moving on, and why in words.
 *
 * A bare boolean would leave the button disabled with nothing to act on; the message names the
 * lifts that are missing, reusing the same copy `requestStartProgram` already shows.
 */
export function setupStepBlockers({
  missingRequiredState,
}: {
  missingRequiredState: ProgramStateInput[]
}): SetupBlocker[] {
  if (!missingRequiredState.length) return []
  return [{ step: 'numbers', message: missingRequiredLoadMessage(missingRequiredState) }]
}

export function blockerForStep(blockers: SetupBlocker[], step: SetupStepId): SetupBlocker | null {
  return blockers.find((blocker) => blocker.step === step) ?? null
}
